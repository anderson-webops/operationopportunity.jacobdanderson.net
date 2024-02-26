import * as mongoose from "mongoose";
import * as argon2 from "argon2";
import express, { Router, Request, Response } from "express";
import { Session } from "express-session";

const router: Router = Router();

interface ITutor extends mongoose.Document {
  name: string;
  email: string;
  age: string;
  state: string;
  password: string;
  usersOfTutorLength: number;
  editTutors: boolean;
  saveEdit: string;
  role: string;
  comparePassword(password: string): Promise<boolean>;
}

const tutorSchema : mongoose.Schema = new mongoose.Schema({
	name: { type: String, required: true },
	email: { type: String, required: true },
	age: { type: String, required: true },
	state: { type: String, required: true },
	password: { type: String, required: true },
	usersOfTutorLength: { type: Number, required: true },
	editTutors: { type: Boolean, required: true },
	saveEdit: { type: String, required: true },
	role: {
		type: String,
		default: "tutor",
	},
});

tutorSchema.pre<ITutor>("save", async function(next) {
	if (!this.isModified("password")) return next();

	try {
		this.password = await argon2.hash(this.password);
		next();
	} catch (error) {
		console.log(`Error: ${error}`);
		if (error instanceof Error) {
			next(error);
		} else { // Handle the case where error is not an instance of Error
			next(new Error("An unknown error occurred"));
		}
	}
});

tutorSchema.methods.comparePassword = async function(this: ITutor, password: string): Promise<boolean> {
	try {
		return await argon2.verify(this.password, password);
	} catch (error) {
		return false;
	}
};

tutorSchema.methods.toJSON = function() {
	const obj = this.toObject();
	delete obj.password;
	return obj;
};

const Tutor = mongoose.model<ITutor>("Tutor", tutorSchema);

interface CustomSession extends Session {
	tutorID?: string;
}

interface TutorRequest extends Request {
	session: CustomSession;
	currentTutor?: ITutor;
}


// Create a tutor
router.post("/", async (req : TutorRequest, res : Response) => {
	if (
		!req.body.name ||
    !req.body.age ||
    !req.body.state ||
    !req.body.email ||
    !req.body.password
	)
		return res.status(400).send({ message: "All fields required" });
	try {
		// existing account name is checked in a separate call in user.js

		const tutor = new Tutor({
			name: req.body.name,
			email: req.body.email,
			age: req.body.age,
			state: req.body.state,
			password: req.body.password,
			usersOfTutorLength: 0,
			editTutors: req.body.editTutors,
			saveEdit: req.body.saveEdit,
		});
		await tutor.save();
		// set user session info
		req.session.tutorID = tutor._id;
		return res.send({ currentTutor: tutor });
	} catch (error) {
		console.log(`Error: ${error}`);
		return res.sendStatus(500).send({
			message: `Error: ${error}`,
		});
	}
});

// Get a list of all tutors
router.get("/", async (req: Request, res: Response) => {
	try {
		const tutors = await Tutor.find();
		res.send(tutors);
	} catch (error) {
		console.error(`Error: ${error}`);
		res.status(500).send({
			message: `Error: ${error}`,
		});
	}
});

// Update tutor info
router.put("/:tutorID", async (req: TutorRequest, res: Response) => {
	try {
		const editedTutor = await Tutor.findOne({ _id: req.params.tutorID });
		if (!editedTutor) {
			return res.sendStatus(404);
		}
		// Assuming body has been validated or sanitized before reaching this point
		editedTutor.name = req.body.name;
		editedTutor.email = req.body.email;
		editedTutor.age = req.body.age;
		editedTutor.state = req.body.state;
		editedTutor.usersOfTutorLength = req.body.usersOfTutorLength;
		editedTutor.editTutors = req.body.editTutors;
		editedTutor.saveEdit = req.body.saveEdit;
		await editedTutor.save();
		res.sendStatus(200);
	} catch (error) {
		console.error(`Error: ${error}`);
		res.status(500).send({
			message: `Error: ${error}`,
		});
	}
});

// Get logged in user
router.get("/loggedin", async (req: TutorRequest, res: Response) => {
	try {
		if (req.currentTutor) {
			res.send({
				currentTutor: req.currentTutor,
			});
		} else {
			res.sendStatus(404);
		}
	} catch (error) {
		console.error(error);
		res.status(500);
	}
});

// Delete a tutor
router.delete("/remove/:tutorID", async (req: Request, res: Response) => {
	try {
		// Use deleteOne with the condition
		const result = await Tutor.deleteOne({
			_id: req.params.tutorID,
		});
		// Check if a document was deleted
		if (result.deletedCount === 0) {
			return res.sendStatus(404);
		}
		return res.sendStatus(200);
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
});

// Logout
router.delete("/logout", async (req: TutorRequest, res: Response) => {
	try {
		// Check if session exists and use the destroy method to invalidate it
		if (req.session) {
			req.session.destroy((err) => {
				if (err) {
					// Log the error and send a 500 status code if session destruction fails
					console.log(err);
					return res.sendStatus(500);
				} else {
					// Send a 200 status code on successful session destruction
					res.sendStatus(200);
				}
			});
		} else {
			// If there is no session to destroy, still respond with 200
			// This caters for the case where the user is not logged in but hits the logout endpoint
			res.sendStatus(200);
		}
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
});

const tutorRoutes : express.Router = router;
export { TutorRequest, ITutor, Tutor, tutorRoutes };
