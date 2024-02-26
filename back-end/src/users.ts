import express, { Request, Response, Router, NextFunction } from "express";
import argon2 from "argon2";
import mongoose, { Schema, Document } from "mongoose";
import { Session } from "express-session";

import {TutorRequest, ITutor, Tutor} from "./tutors.js";

const router : express.Router = Router();

/********************
 *   User Methods   *
 *******************/

interface CustomSession extends Session {
	userID?: string;
	tutorID?: string;
}

// Assuming an interface for User and Tutor models to help with TypeScript typing
interface IUser extends Document {
	name: string;
	email: string;
	age: number;
	state: string;
	password: string; // Ensure this is included if you're using it
	editUsers?: boolean;
	saveEdit?: boolean;
	comparePassword(candidatePassword: string): Promise<boolean>;
	tutor?: Schema.Types.ObjectId;
}

// This is the schema. Users have usernames and passwords. We solemnly promise to
// Schema for users
const userSchema: Schema = new Schema({
	name: { type: String, required: true },
	email: { type: String, required: true },
	age: { type: Number, required: true },
	state: { type: String, required: true },
	password: { type: String, required: true },
	editUsers: { type: Boolean, default: false },
	saveEdit: { type: Boolean, default: false },
	role: { type: String, default: "user" },
	// If you're referencing another model, ensure the reference is correct
	tutor: { type: Schema.Types.ObjectId, ref: "Tutor", default: null },
});

// This is a hook that will be called before a user record is saved,
// allowing us to be sure to salt and hash the password first.
userSchema.pre<IUser>("save", async function (next) {
	// only hash the password if it has been modified (or is new)
	if (!this.isModified("password")) return next();

	try {
		// generate a hash. argon2 does the salting and hashing for us and
		// override the plaintext password with the hashed one
		this.password = await argon2.hash(this.password); //was variable hash
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

// This is a method that we can call on User objects to compare the hash of the
// password the browser sends with the has of the user's true password stored in
// the database.
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
	try {
		// note that we supply the hash stored in the database (first argument) and
		// the plaintext password. argon2 will do the hashing and salting and
		// comparison for us.
		return await argon2.verify(this.password, candidatePassword);
	} catch (error) {
		return false;
	}
};

// This is a method that will be called automatically any time we convert a user
// object to JSON. It deletes the password hash from the object. This ensures
// that we never send password hashes over our API, to avoid giving away
// anything to an attacker.
userSchema.methods.toJSON = function () {
	const obj = this.toObject();
	delete obj.password;
	return obj;
};

// create a User model from the User schema
const User = mongoose.model<IUser>("User", userSchema);

// Middleware to check for logged-in users
interface UserRequest extends Request {
	session: CustomSession;
	currentUser?: IUser;
}

/* Middleware */

// Middleware to check for logged-in users
const validUser = async (req: UserRequest, res: Response, next: NextFunction) => {
	// Check if the user ID is present in the session
	if (!req.session?.userID) {
		return res.status(403).json({
			message: "Not logged in or session expired",
		});
	}

	try {
		// Attempt to find the user by ID
		const user = await User.findById(req.session.userID) as IUser;

		// If no user found, respond with an error
		if (!user) {
			return res.status(403).json({
				message: "User account not found",
			});
		}

		// Attach the user object to the request for use in subsequent middleware/route handlers
		req.currentUser = user;

		// Proceed to the next middleware or route handler
		next();
	} catch (error) {
		// Log the error for debugging purposes
		console.error("Error in validUser middleware:", error);

		// Respond with a general error message
		// Consider customizing the error response based on the error type or details
		res.status(500).json({
			message: "Server error while validating tutor",
		});
	}
};

// Middleware to check for logged-in tutors
const validTutor = async (req: TutorRequest, res: Response, next: NextFunction) => {
	// Check if the tutor ID is present in the session
	if (!req.session?.tutorID) {
		return res.status(403).json({
			message: "Not logged in or session expired",
		});
	}

	try {
		// Attempt to find the tutor by ID
		const tutor = await Tutor.findById(req.session.tutorID);

		// If no tutor found, respond with an error
		if (!tutor) {
			return res.status(403).json({
				message: "Tutor account not found",
			});
		}

		// Attach the tutor object to the request for use in subsequent middleware/route handlers
		req.currentTutor = tutor;

		// Proceed to the next middleware or route handler
		next();
	} catch (error) {
		// Log the error for debugging purposes
		console.error("Error in validTutor middleware:", error);

		// Respond with a general error message
		// Consider customizing the error response based on the error type or details
		res.status(500).json({
			message: "Server error while validating tutor",
		});
	}
};

// Create a user
router.post("/", async (req: UserRequest, res: Response) => {
	if (
		!req.body.name ||
    !req.body.age ||
    !req.body.state ||
    !req.body.email ||
    !req.body.password
	)
		return res.status(400).send({ message: "All fields required" });
	try {
		const user : IUser = new User({
			name: req.body.name,
			email: req.body.email,
			age: req.body.age,
			state: req.body.state,
			password: req.body.password,
			editUsers: req.body.editUsers,
			saveEdit: req.body.saveEdit,
		});
		await user.save();
		req.session.userID = user._id;
		return res.send({ currentUser: user });
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
});

/*// Get users belonging to a tutor
router.get("/user/:userID", async (req, res) => {
  try {
    let user = await User.findOne({ _id: req.params.userID });
    if (!user) {
      return res.sendStatus(404);
    }
    return res.send(user);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});*/

// Get users belonging to a tutor
router.get("/oftutor/:tutorID", async (req: Request, res: Response) => {
	try {
		const tutor: ITutor | null = await Tutor.findOne({ _id: req.params.tutorID });
		if (!tutor) {
			return res.sendStatus(404);
		}
		const users: IUser[] = await User.find({ tutor: tutor });
		return res.send(users);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Get all users
router.get("/all", async (req: Request, res: Response) => {
	try {
		const users: IUser[] = await User.find();
		return res.send(users);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Update user info
router.put("/user/:userID", validUser, async (req: Request, res: Response) => {
	try {
		const user: IUser | null = await User.findOne({
			_id: req.params.userID,
		});
		if (!user) {
			return res.sendStatus(404);
		}
		user.name = req.body.name;
		user.email = req.body.email;
		user.age = req.body.age;
		user.state = req.body.state;
		user.editUsers = req.body.editUsers;
		user.saveEdit = req.body.saveEdit;
		await user.save();
		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Update user info to avoid circular dependencies
router.put("/tutor/:userID", validTutor, async (req: Request, res: Response) => {
	try {
		const user: IUser | null = await User.findOne({
			_id: req.params.userID,
		});
		if (!user) {
			return res.sendStatus(404);
		}
		user.name = req.body.name;
		user.email = req.body.email;
		user.age = req.body.age;
		user.state = req.body.state;
		user.editUsers = req.body.editUsers;
		user.saveEdit = req.body.saveEdit;
		await user.save();
		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Select a tutor for a user
router.put("/tutor/:userID/:tutorID", async (req: UserRequest, res: Response) => {
	try {
		const user: IUser | null = await User.findOne({
			_id: req.params.userID,
		});
		if (!user) {
			return res.sendStatus(404);
		}

		const tutor: ITutor | null = await Tutor.findOne({
			_id: req.params.tutorID,
		});
		if (!tutor) {
			return res.sendStatus(404);
		}

		user.tutor = tutor._id;

		await user.save();
		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Delete the user
router.delete("/user/:userID", validUser, async (req: Request, res: Response) => {
	try {
		// Use deleteOne with the condition
		const result = await User.deleteOne({
			_id: req.params.userID,
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

// Delete the tutor
router.delete("/tutor/:userID", validTutor, async (req: Request, res: Response) => {
	try {
		// Use deleteOne with the condition
		const result = await User.deleteOne({
			_id: req.params.userID,
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

// Delete users under tutor
router.delete("/under/:tutorID", async (req: Request, res: Response) => {
	try {
		const tutor = await Tutor.findOne({ _id: req.params.tutorID });
		if (!tutor) {
			return res.sendStatus(404);
		}
		const users = await User.find({ tutor: tutor._id });
		if (!users) {
			return res.sendStatus(404);
		}

		for (const user of users) {
			await User.deleteOne({ _id: user._id });
		}
		return res.sendStatus(200);
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
});

// Get logged in user
router.get("/loggedin", validUser, async (req: UserRequest, res: Response) => {
	try {
		res.send({
			currentUser: req.currentUser,
		});
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
});

// Logout
router.delete("/logout", validUser, async (req: Request, res: Response) => {
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


const userRoutes : express.Router = router;
export { IUser, User, userRoutes };
