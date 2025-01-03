import * as mongoose from "mongoose";
import * as argon2 from "argon2";
import express, { Router, Request, Response } from "express";
import { Session } from "express-session";
import { hashPasswordIfModified } from "./hash";

const router: Router = Router();

export interface ITutor extends mongoose.Document {
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

const tutorSchema = new mongoose.Schema({
	name: { type: String, required: true },
	email: { type: String, required: true },
	age: { type: String, required: true },
	state: { type: String, required: true },
	password: { type: String, required: true },
	usersOfTutorLength: { type: Number, required: true, default: 0 },
	editTutors: { type: Boolean, required: true, default: false },
	saveEdit: { type: String, required: true, default: "Edit" },
	role: {
		type: String,
		default: "tutor",
	},
});

// Pre-save hook for password hashing
tutorSchema.pre("save", hashPasswordIfModified);

// Compare password
tutorSchema.methods.comparePassword = async function (
	this: ITutor,
	password: string
): Promise<boolean> {
	try {
		return await argon2.verify(this.password, password);
	} catch (error) {
		return false;
	}
};

// Remove password field from JSON
tutorSchema.methods.toJSON = function () {
	const obj = this.toObject();
	delete obj.password;
	return obj;
};

export const Tutor = mongoose.model<ITutor>("Tutor", tutorSchema);

// Extend session interface
interface CustomSession extends Session {
	tutorID?: string;
}

export interface TutorRequest extends Request {
	session: CustomSession;
	currentTutor?: ITutor;
}

// Create a tutor
router.post("/", async (req: TutorRequest, res: Response) => {
	if (
		!req.body.name ||
		!req.body.age ||
		!req.body.state ||
		!req.body.email ||
		!req.body.password
	) {
		return res.status(400).send({ message: "All fields required" });
	}
	try {
		const tutor = new Tutor({
			name: req.body.name,
			email: req.body.email,
			age: req.body.age,
			state: req.body.state,
			password: req.body.password,
			usersOfTutorLength: req.body.usersOfTutorLength ?? 0,
			editTutors: req.body.editTutors ?? false,
			saveEdit: req.body.saveEdit ?? "Edit",
		});
		await tutor.save();

		// set user session info
		req.session.tutorID = tutor._id.toString();
		return res.send({ currentTutor: tutor });
	} catch (error) {
		console.error(`Error: ${error}`);
		return res.status(500).send({
			message: `Error: ${error}`,
		});
	}
});

// Get all tutors
router.get("/", async (_req: Request, res: Response) => {
	try {
		const tutors = await Tutor.find();
		return res.send(tutors);
	} catch (error) {
		console.error(`Error: ${error}`);
		return res.status(500).send({
			message: `Error: ${error}`,
		});
	}
});

// Update tutor
router.put("/:tutorID", async (req: TutorRequest, res: Response) => {
	try {
		const editedTutor = await Tutor.findOne({ _id: req.params.tutorID });
		if (!editedTutor) {
			return res.sendStatus(404);
		}
		editedTutor.name = req.body.name ?? editedTutor.name;
		editedTutor.email = req.body.email ?? editedTutor.email;
		editedTutor.age = req.body.age ?? editedTutor.age;
		editedTutor.state = req.body.state ?? editedTutor.state;
		editedTutor.usersOfTutorLength =
			req.body.usersOfTutorLength ?? editedTutor.usersOfTutorLength;
		editedTutor.editTutors = req.body.editTutors ?? editedTutor.editTutors;
		editedTutor.saveEdit = req.body.saveEdit ?? editedTutor.saveEdit;

		// If you'd like to let them change their password, you'd handle hashing again
		// if (req.body.password) { ... }

		await editedTutor.save();
		return res.sendStatus(200);
	} catch (error) {
		console.error(`Error: ${error}`);
		return res.status(500).send({
			message: `Error: ${error}`,
		});
	}
});

// Check logged in tutor
router.get("/loggedin", async (req: TutorRequest, res: Response) => {
	try {
		if (req.currentTutor) {
			return res.send({ currentTutor: req.currentTutor });
		}
		return res.sendStatus(404);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Delete a tutor
router.delete("/remove/:tutorID", async (req: Request, res: Response) => {
	try {
		const result = await Tutor.deleteOne({ _id: req.params.tutorID });
		if (result.deletedCount === 0) {
			return res.sendStatus(404);
		}
		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Logout
router.delete("/logout", async (req: TutorRequest, res: Response) => {
	try {
		if (req.session) {
			req.session.destroy((err) => {
				if (err) {
					console.error(err);
					return res.sendStatus(500);
				}
				return res.sendStatus(200);
			});
		} else {
			return res.sendStatus(200);
		}
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

export const tutorRoutes: express.Router = router;
