import express, {NextFunction, Request, Response, Router} from "express";
import {Session} from "express-session";
import mongoose from "mongoose";
import argon2 from "argon2";

import {ITutor, Tutor} from "./tutors.js";
import {IUser, User} from "./users.js";

const router: Router = express.Router();

interface IAdmin extends mongoose.Document, Document {
    name: string;
    email: string;
    password: string;
    editAdmins: boolean;
    saveEdit: string;
    role: string;
    comparePassword: (password: string) => Promise<boolean>;
}

interface CustomSession extends Session {
	adminID?: string;
}

interface AdminRequest extends Request {
	session: CustomSession;
	currentAdmin?: IAdmin;
}

// Admin schema
const adminSchema: mongoose.Schema = new mongoose.Schema({
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
adminSchema.pre<IAdmin>("save", async function (next) {
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

// Method to compare passwords
adminSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
	try {
		return await argon2.verify(this.password, password);
	} catch (error) {
		return false;
	}
};

// Method to remove password field from the JSON representation of an admin document
adminSchema.methods.toJSON = function (): object {
	const obj = this.toObject();
	delete obj.password;
	return obj;
};

// Admin model
const Admin = mongoose.model<IAdmin>("Admin", adminSchema);

// Middleware to check for logged-in admins
const validAdmin = async (req: AdminRequest, res: Response, next: NextFunction) => {
	// Check if the admin ID is present in the session
	if (!req.session?.adminID) {
		return res.status(403).json({
			message: "Not logged in or session expired",
		});
	}

	try {
		// Attempt to find the admin by ID
		const admin = await Admin.findOne({_id: req.session.adminID});

		// If no admin found, respond with an error
		if (!admin) {
			return res.status(403).json({
				message: "Admin account not found",
			});
		}

		// Attach the admin object to the request for use in subsequent middleware/route handlers
		req.currentAdmin = admin;

		// Proceed to the next middleware or route handler
		next();
	} catch (error) {
		// Log the error for debugging purposes
		console.error("Error in validAdmin middleware:", error);

		// Respond with a general error message
		// Consider customizing the error response based on the error type or details
		res.status(500).json({
			message: "Server error while validating admin",
		});
	}
};

// Route to create an admin
router.post("/", async (req: AdminRequest, res: Response) => {
	if (!req.body.name || !req.body.email || !req.body.password)
		return res.status(400).send({message: "All fields required"});
	try {
		const admin = new Admin({
			name: req.body.name,
			email: req.body.email,
			password: req.body.password,
			editAdmins: req.body.editAdmins,
			saveEdit: req.body.saveEdit,
		});
		await admin.save();
		req.session.adminID = admin._id;
		return res.send({currentAdmin: admin});
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
});

// Get all admins
router.get("/", async (_req: Request, res: Response) => {
	try {
		const admins = await Admin.find();
		return res.send(admins);
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
});

// Update admin info
router.put("/:adminID", async (req: Request, res: Response) => {
	try {
		const admin = await Admin.findOne({
			_id: req.params.adminID,
		}) as IAdmin;
		if (!admin) {
			return res.sendStatus(404);
		}
		admin.name = req.body.name;
		admin.email = req.body.email;
		admin.editAdmins = req.body.editAdmins;
		admin.saveEdit = req.body.saveEdit;
		await admin.save();
		return res.sendStatus(200);
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
});

// Delete the admin
router.delete("/remove/:adminID", validAdmin, async (req: Request, res: Response) => {
	try {
		await Admin.deleteOne({_id: req.params.adminID});
		return res.sendStatus(200);
	} catch (error) {
		console.log(error);
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
		console.log(error);
		return res.sendStatus(500);
	}
});

/* Tutor Edits */

// Update tutor info
router.put("/tutor/:tutorID", validAdmin, async (req: Request, res: Response) => {
	try {
		const editedTutor = await Tutor.findOne({_id: req.params.tutorID}) as ITutor;
		if (!editedTutor) {
			return res.sendStatus(404);
		}
		// Update fields as needed
		await editedTutor.save();
		return res.sendStatus(200);
	} catch (error) {
		console.log(`Error: ${error}`);
		return res.sendStatus(500);
	}
});

// Delete a tutor
router.delete("/tutor/:tutorID", validAdmin, async (req: Request, res: Response) => {
	try {
		await Tutor.deleteOne({_id: req.params.tutorID});
		return res.sendStatus(200);
	} catch (error) {
		console.log(`Error: ${error}`);
		return res.sendStatus(500);
	}
});

/* User Edits */

// Update user info
router.put("/user/:userID", validAdmin, async (req: Request, res: Response) => {
	try {
		const user = await User.findOne({
			_id: req.params.userID,
		}) as IUser;
		if (!user) {
			return res.sendStatus(404);
		}
		// Update fields as needed
		await user.save();
		return res.sendStatus(200);
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
});

// Delete the user
router.delete("/user/:userID", validAdmin, async (req: Request, res: Response) => {
	try {
		await User.deleteOne({_id: req.params.userID});
		return res.sendStatus(200);
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
});

const adminRoutes: express.Router = router;
export {IAdmin, Admin, validAdmin, adminRoutes};
