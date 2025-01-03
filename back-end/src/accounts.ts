import express, { Request, Response } from "express";
import { Session } from "express-session";
import { IAdmin, Admin } from "./admins.js";
import { ITutor, Tutor } from "./tutors.js";
import { IUser, User } from "./users.js";

const router = express.Router();

// Extend the default Session to store IDs
interface CustomSession extends Session {
	userID?: string;
	tutorID?: string;
	adminID?: string;
}

// Extend the Request object for POST bodies
interface AccountRequest extends Request {
	session: CustomSession;
	body: {
		email?: string;
		password?: string;
	};
}

// Create an account (checks if email exists in any of the 3 collections)
router.post("/", async (req: AccountRequest, res: Response) => {
	if (!req.body.email) {
		return res.status(400).send({ message: "Email field required" });
	}
	try {
		const existingUser = await User.findOne({ email: req.body.email });
		const existingTutor = await Tutor.findOne({ email: req.body.email });
		const existingAdmin = await Admin.findOne({ email: req.body.email });

		if (existingUser || existingTutor || existingAdmin) {
			return res.status(403).send({ message: "Username already exists" });
		}
		// Otherwise, you can create the user here if you want
		// or you can simply return 200 to indicate 'all good, proceed'
		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Change email
router.post("/changeEmail/:ID", async (req: AccountRequest, res: Response) => {
	try {
		const tutorID = (await Tutor.findOne({ _id: req.params.ID })) as ITutor | null;
		const userID = (await User.findOne({ _id: req.params.ID })) as IUser | null;
		const adminID = (await Admin.findOne({ _id: req.params.ID })) as IAdmin | null;

		// Identify which model we found
		const userTypeWithID = tutorID || userID || adminID;
		if (!userTypeWithID) {
			return res.sendStatus(404);
		}

		// Check if the new email is already taken
		const tutor = (await Tutor.findOne({ email: req.body.email })) as ITutor | null;
		const user = (await User.findOne({ email: req.body.email })) as IUser | null;
		const admin = (await Admin.findOne({ email: req.body.email })) as IAdmin | null;
		const userTypeWithEmail = tutor || user || admin;

		// If we found an existing account with that email (and it's not the same user),
		// block the change
		if (
			userTypeWithEmail &&
			userTypeWithEmail.email !== userTypeWithID.email
		) {
			return res.status(403).send({ message: "Email already exists" });
		}

		// If passing checks, do the actual update
		userTypeWithID.email = req.body.email || userTypeWithID.email;
		await userTypeWithID.save();

		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Login
router.post("/login", async (req: AccountRequest, res: Response) => {
	if (!req.body.email || !req.body.password) {
		return res.status(400).send({ message: "Email and password required" });
	}
	try {
		// Attempt to find the user in any of the three collections
		const tutor = await Tutor.findOne({ email: req.body.email });
		const user = await User.findOne({ email: req.body.email });
		const admin = await Admin.findOne({ email: req.body.email });

		if (!tutor && !user && !admin) {
			return res.status(403).send({ message: "Username or password is incorrect" });
		}

		// Compare password for whichever doc we found
		if (tutor && !(await tutor.comparePassword(req.body.password))) {
			return res.status(403).send({ message: "Username or password is incorrect" });
		}
		if (user && !(await user.comparePassword(req.body.password))) {
			return res.status(403).send({ message: "Username or password is incorrect" });
		}
		if (admin && !(await admin.comparePassword(req.body.password))) {
			return res.status(403).send({ message: "Username or password is incorrect" });
		}

		// If password matches, store in session
		if (admin) {
			req.session.adminID = admin._id.toString();
			return res.send({ currentAdmin: admin });
		} else if (tutor) {
			req.session.tutorID = tutor._id.toString();
			return res.send({ currentTutor: tutor });
		} else if (user) {
			req.session.userID = user._id.toString();
			return res.send({ currentUser: user });
		} else {
			return res.status(403).send({ message: "No user, tutor, nor admin" });
		}
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

export const accountRoutes = router;
