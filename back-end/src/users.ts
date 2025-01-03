import express, { Router, Request, Response, NextFunction } from "express";
import argon2 from "argon2";
import mongoose, { Schema, Document } from "mongoose";
import { Session } from "express-session";

import { TutorRequest, ITutor, Tutor } from "./tutors.js";

const router: Router = Router();

interface CustomSession extends Session {
	userID?: string;
	tutorID?: string;
}

// User interface
export interface IUser extends Document {
	name: string;
	email: string;
	age: number;
	state: string;
	password: string;
	editUsers?: boolean;
	saveEdit?: boolean;
	role: string;
	tutor?: Schema.Types.ObjectId;
	comparePassword(candidatePassword: string): Promise<boolean>;
}

// Mongoose schema
const userSchema: Schema<IUser> = new Schema({
	name: { type: String, required: true },
	email: { type: String, required: true },
	age: { type: Number, required: true },
	state: { type: String, required: true },
	password: { type: String, required: true },
	editUsers: { type: Boolean, default: false },
	saveEdit: { type: Boolean, default: false },
	role: { type: String, default: "user" },
	tutor: { type: Schema.Types.ObjectId, ref: "Tutor", default: null },
});

// Pre-save for password hashing
userSchema.pre<IUser>("save", async function (next) {
	if (!this.isModified("password")) return next();
	try {
		this.password = await argon2.hash(this.password);
		next();
	} catch (error) {
		console.error(`Error: ${error}`);
		if (error instanceof Error) {
			next(error);
		} else {
			next(new Error("An unknown error occurred"));
		}
	}
});

// Compare password
userSchema.methods.comparePassword = async function (
	candidatePassword: string
): Promise<boolean> {
	try {
		return await argon2.verify(this.password, candidatePassword);
	} catch {
		return false;
	}
};

// Remove password on toJSON
userSchema.methods.toJSON = function () {
	const obj = this.toObject();
	delete obj.password;
	return obj;
};

// Create model
export const User = mongoose.model<IUser>("User", userSchema);

// Extend Request for user
interface UserRequest extends Request {
	session: CustomSession;
	currentUser?: IUser;
}

/* Middlewares */

// Check for logged-in user
const validUser = async (req: UserRequest, res: Response, next: NextFunction) => {
	if (!req.session?.userID) {
		return res.status(403).json({
			message: "Not logged in or session expired",
		});
	}
	try {
		const user = await User.findById(req.session.userID);
		if (!user) {
			return res.status(403).json({
				message: "User account not found",
			});
		}
		req.currentUser = user;
		next();
	} catch (error) {
		console.error("Error in validUser middleware:", error);
		res.status(500).json({
			message: "Server error while validating user",
		});
	}
};

// Check for logged-in tutor
const validTutor = async (req: TutorRequest, res: Response, next: NextFunction) => {
	if (!req.session?.tutorID) {
		return res.status(403).json({
			message: "Not logged in or session expired",
		});
	}
	try {
		const tutor = await Tutor.findById(req.session.tutorID);
		if (!tutor) {
			return res.status(403).json({ message: "Tutor account not found" });
		}
		req.currentTutor = tutor;
		next();
	} catch (error) {
		console.error("Error in validTutor middleware:", error);
		res.status(500).json({
			message: "Server error while validating tutor",
		});
	}
};

/* Routes */

// Create a user
router.post("/", async (req: UserRequest, res: Response) => {
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
		const user = new User({
			name: req.body.name,
			email: req.body.email,
			age: req.body.age,
			state: req.body.state,
			password: req.body.password,
			editUsers: req.body.editUsers,
			saveEdit: req.body.saveEdit,
		});
		await user.save();
		req.session.userID = user._id.toString();
		return res.send({ currentUser: user });
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Get users belonging to a given tutor
router.get("/oftutor/:tutorID", async (req: Request, res: Response) => {
	try {
		const tutor: ITutor | null = await Tutor.findOne({ _id: req.params.tutorID });
		if (!tutor) {
			return res.sendStatus(404);
		}
		const users: IUser[] = await User.find({ tutor: tutor._id });
		return res.send(users);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Get all users
router.get("/all", async (_req: Request, res: Response) => {
	try {
		const users: IUser[] = await User.find();
		return res.send(users);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Update user info by the user themselves
router.put("/user/:userID", validUser, async (req: UserRequest, res: Response) => {
	try {
		const user: IUser | null = await User.findOne({ _id: req.params.userID });
		if (!user) {
			return res.sendStatus(404);
		}
		user.name = req.body.name ?? user.name;
		user.email = req.body.email ?? user.email;
		user.age = req.body.age ?? user.age;
		user.state = req.body.state ?? user.state;
		user.editUsers = req.body.editUsers ?? user.editUsers;
		user.saveEdit = req.body.saveEdit ?? user.saveEdit;

		// If you want to allow them to change password, handle hashing logic here
		await user.save();
		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Update user info by the tutor
router.put("/tutor/:userID", validTutor, async (req: TutorRequest, res: Response) => {
	try {
		const user: IUser | null = await User.findOne({ _id: req.params.userID });
		if (!user) {
			return res.sendStatus(404);
		}
		user.name = req.body.name ?? user.name;
		user.email = req.body.email ?? user.email;
		user.age = req.body.age ?? user.age;
		user.state = req.body.state ?? user.state;
		user.editUsers = req.body.editUsers ?? user.editUsers;
		user.saveEdit = req.body.saveEdit ?? user.saveEdit;
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
		const user: IUser | null = await User.findOne({ _id: req.params.userID });
		if (!user) {
			return res.sendStatus(404);
		}
		const tutor: ITutor | null = await Tutor.findOne({ _id: req.params.tutorID });
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

// Delete the user by the user themselves
router.delete("/user/:userID", validUser, async (req: Request, res: Response) => {
	try {
		const result = await User.deleteOne({ _id: req.params.userID });
		if (result.deletedCount === 0) {
			return res.sendStatus(404);
		}
		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Delete the user by the tutor
router.delete("/tutor/:userID", validTutor, async (req: Request, res: Response) => {
	try {
		const result = await User.deleteOne({ _id: req.params.userID });
		if (result.deletedCount === 0) {
			return res.sendStatus(404);
		}
		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Delete users under a tutor
router.delete("/under/:tutorID", async (req: Request, res: Response) => {
	try {
		const tutor = await Tutor.findOne({ _id: req.params.tutorID });
		if (!tutor) {
			return res.sendStatus(404);
		}
		const users = await User.find({ tutor: tutor._id });
		if (!users || users.length === 0) {
			return res.sendStatus(404);
		}
		for (const user of users) {
			await User.deleteOne({ _id: user._id });
		}
		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Get logged in user
router.get("/loggedin", validUser, async (req: UserRequest, res: Response) => {
	try {
		res.send({ currentUser: req.currentUser });
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Logout
router.delete("/logout", validUser, async (req: Request, res: Response) => {
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

export const userRoutes: express.Router = router;
