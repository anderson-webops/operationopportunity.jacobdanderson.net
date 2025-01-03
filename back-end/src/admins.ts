import express, { NextFunction, Request, Response, Router } from "express";
import { Session } from "express-session";
import mongoose from "mongoose";
import argon2 from "argon2";

import { ITutor, Tutor } from "./tutors.js";
import { IUser, User } from "./users.js";
import { hashPasswordIfModified } from "./hash";

const router: Router = express.Router();

export interface IAdmin extends mongoose.Document {
	name: string;
	email: string;
	password: string;
	editAdmins: boolean;
	saveEdit: string;
	role: string;
	comparePassword: (password: string) => Promise<boolean>;
}

// Extend Session for storing adminID
interface CustomSession extends Session {
	adminID?: string;
}

interface AdminRequest extends Request {
	session: CustomSession;
	currentAdmin?: IAdmin;
}

// Admin schema
const adminSchema = new mongoose.Schema({
	name: String,
	email: String,
	password: String,
	editAdmins: Boolean,
	saveEdit: String,
	role: {
		type: String,
		default: "admin",
	},
});

// Pre-save hook for password hashing
adminSchema.pre("save", hashPasswordIfModified);

// Method to compare passwords
adminSchema.methods.comparePassword = async function (
	password: string
): Promise<boolean> {
	try {
		return await argon2.verify(this.password, password);
	} catch (error) {
		return false;
	}
};

// Remove password field from JSON
adminSchema.methods.toJSON = function (): object {
	const obj = this.toObject();
	delete obj.password;
	return obj;
};

export const Admin = mongoose.model<IAdmin>("Admin", adminSchema);

// Middleware to check for logged-in admins
export const validAdmin = async (
	req: AdminRequest,
	res: Response,
	next: NextFunction
) => {
	// Check if adminID is present in session
	if (!req.session?.adminID) {
		return res.status(403).json({
			message: "Not logged in or session expired",
		});
	}

	try {
		// Attempt to find the admin by ID
		const admin = await Admin.findOne({ _id: req.session.adminID });
		if (!admin) {
			return res.status(403).json({
				message: "Admin account not found",
			});
		}
		req.currentAdmin = admin;
		next();
	} catch (error) {
		console.error("Error in validAdmin middleware:", error);
		res.status(500).json({
			message: "Server error while validating admin",
		});
	}
};

// Route to create an admin
router.post("/", async (req: AdminRequest, res: Response) => {
	if (!req.body.name || !req.body.email || !req.body.password) {
		return res.status(400).send({ message: "All fields required" });
	}
	try {
		const admin = new Admin({
			name: req.body.name,
			email: req.body.email,
			password: req.body.password,
			editAdmins: req.body.editAdmins,
			saveEdit: req.body.saveEdit,
		});
		await admin.save();
		req.session.adminID = admin._id.toString();
		return res.send({ currentAdmin: admin });
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Get all admins
router.get("/", async (_req: Request, res: Response) => {
	try {
		const admins = await Admin.find();
		return res.send(admins);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Update admin info
router.put("/:adminID", async (req: Request, res: Response) => {
	try {
		const admin = (await Admin.findOne({
			_id: req.params.adminID,
		})) as IAdmin | null;

		if (!admin) {
			return res.sendStatus(404);
		}
		admin.name = req.body.name ?? admin.name;
		admin.email = req.body.email ?? admin.email;
		admin.editAdmins = req.body.editAdmins ?? admin.editAdmins;
		admin.saveEdit = req.body.saveEdit ?? admin.saveEdit;

		await admin.save();
		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Delete the admin
router.delete("/remove/:adminID", validAdmin, async (req: Request, res: Response) => {
	try {
		await Admin.deleteOne({ _id: req.params.adminID });
		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Get logged-in admin
router.get("/loggedin", validAdmin, async (req: AdminRequest, res: Response) => {
	try {
		res.send({
			currentAdmin: req.currentAdmin,
		});
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

/* Tutor Edits */

// Update tutor info
router.put("/tutor/:tutorID", validAdmin, async (req: Request, res: Response) => {
	try {
		const editedTutor = await Tutor.findOne({ _id: req.params.tutorID }) as ITutor | null;
		if (!editedTutor) {
			return res.sendStatus(404);
		}
		// Update fields as needed
		editedTutor.name = req.body.name ?? editedTutor.name;
		editedTutor.email = req.body.email ?? editedTutor.email;
		// etc...
		await editedTutor.save();
		return res.sendStatus(200);
	} catch (error) {
		console.error(`Error: ${error}`);
		return res.sendStatus(500);
	}
});

// Delete a tutor
router.delete("/tutor/:tutorID", validAdmin, async (req: Request, res: Response) => {
	try {
		await Tutor.deleteOne({ _id: req.params.tutorID });
		return res.sendStatus(200);
	} catch (error) {
		console.error(`Error: ${error}`);
		return res.sendStatus(500);
	}
});

/* User Edits */

// Update user info
router.put("/user/:userID", validAdmin, async (req: Request, res: Response) => {
	try {
		const user = await User.findOne({ _id: req.params.userID }) as IUser | null;
		if (!user) {
			return res.sendStatus(404);
		}
		user.name = req.body.name ?? user.name;
		user.email = req.body.email ?? user.email;
		// etc...
		await user.save();
		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

// Delete the user
router.delete("/user/:userID", validAdmin, async (req: Request, res: Response) => {
	try {
		await User.deleteOne({ _id: req.params.userID });
		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
});

const adminRoutes: express.Router = router;
export { adminRoutes };
