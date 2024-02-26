import express, { Request, Response } from "express";
import { Session } from "express-session";

import { IAdmin, Admin } from "./admins.js";
import { ITutor, Tutor } from "./tutors.js";
import { IUser, User } from "./users.js";

const router = express.Router();

interface CustomSession extends Session {
	userID?: string;
	tutorID?: string;
	adminID?: string;
}

// Define a type for the request body in POST requests
interface AccountRequest extends Request {
	session: CustomSession;
	email?: string;
	password?: string;
}

interface IUserType {
	email: string;
	// include other common properties and methods here, like a method for password comparison
	comparePassword: (candidatePassword: string) => Promise<boolean>;
}


// Create an account
router.post("/", async (req: AccountRequest, res: Response) => {
	if (!req.body.email) return res.status(400).send({ message: "Email field required" });
	try {
		const existingUser = await User.findOne({ email: req.body.email });
		const existingTutor = await Tutor.findOne({ email: req.body.email });
		const existingAdmin = await Admin.findOne({ email: req.body.email });
		if (existingUser || existingTutor || existingAdmin)
			return res.status(403).send({ message: "username already exists" });
		return res.sendStatus(200);
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
});

// Change password
router.post("/changeEmail/:ID", async (req: AccountRequest, res: Response) => {
	try {
		const tutorID = await Tutor.findOne({ _id: req.params.ID }) as ITutor | null;
		const userID = await User.findOne({ _id: req.params.ID }) as IUser | null;
		const adminID = await Admin.findOne({ _id: req.params.ID }) as IAdmin | null;
		const userTypeWithID: IUserType | null = tutorID || userID || adminID;

		if (!userTypeWithID) return res.sendStatus(404);

		const tutor = await Tutor.findOne({ email: req.body.email }) as ITutor | null;
		const user = await User.findOne({ email: req.body.email }) as IUser | null;
		const admin = await Admin.findOne({ email: req.body.email }) as IAdmin | null;

		// Correctly use logical OR to find the first non-null user type
		const userTypeWithEmail: IUserType | null = tutor || user || admin;

		if (userTypeWithEmail && userTypeWithEmail.email !== userTypeWithID.email)
			return res.status(403).send({ message: "Email already exists" });

		// Your logic to change the email goes here
		// Remember to save the updated document

		return res.sendStatus(200);
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
});

// Login
router.post("/login", async (req: AccountRequest, res: Response) => {
	if (!req.body.email || !req.body.password) return res.sendStatus(400);

	try {
		const tutor = await Tutor.findOne({ email: req.body.email });
		const user = await User.findOne({ email: req.body.email });
		const admin = await Admin.findOne({ email: req.body.email });
		if (!tutor && !user && !admin)
			return res.status(403).send({ message: "username or password is incorrect" });

		// Assume comparePassword is a method implemented in the models
		if (tutor && !(await tutor.comparePassword(req.body.password)))
			return res.status(403).send({ message: "username or password is incorrect" });
		if (user && !(await user.comparePassword(req.body.password)))
			return res.status(403).send({ message: "username or password is incorrect" });
		if (admin && !(await admin.comparePassword(req.body.password)))
			return res.status(403).send({ message: "username or password is incorrect" });

		// Adjust session logic as needed
		if (admin) {
			req.session.adminID = admin._id;
			return res.send({ currentAdmin: admin });
		} else if (tutor) {
			req.session.tutorID = tutor._id;
			return res.send({ currentTutor: tutor });
		} else if (user) {
			req.session.userID = user._id;
			return res.send({ currentUser: user });
		} else {
			return res.status(403).send({ message: "No user, tutor, nor admin" });
		}
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
});

export const accountRoutes = router;
