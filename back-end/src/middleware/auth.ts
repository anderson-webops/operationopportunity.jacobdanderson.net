// src/middleware/auth.ts
import { RequestHandler } from "express";
import { User } from "../models/User";
import { Tutor } from "../models/Tutor";
import { Admin } from "../models/Admin";
import { CustomSession } from "../types/CustomSession";
import { IUser } from "../types/IUser";
import { ITutor } from "../types/ITutor";
import { IAdmin } from "../types/IAdmin";

// Extend Request for User
export interface UserRequest extends Request {
	session: CustomSession;
	currentUser?: IUser;
	currentTutor?: ITutor;
	currentAdmin?: IAdmin;
}

// Middleware to validate User
export const validUser: RequestHandler = async (
	req,
	res,
	next
) => {
	if (!req.session?.userID) {
		res.status(403).json({ message: "Not logged in or session expired" });
		return;
	}
	try {
		const user = await User.findById(req.session.userID);
		if (!user) {
			res.status(403).json({ message: "User account not found" });
			return;
		}
		req.currentUser = user;
		next();
	} catch (error) {
		console.error("Error in validUser middleware:", error);
		res.status(500).json({ message: "Server error while validating user" });
	}
};

// Middleware to validate Tutor
export const validTutor: RequestHandler = async (
	req,
	res,
	next
) => {
	if (!req.session?.tutorID) {
		res.status(403).json({ message: "Not logged in or session expired" });
		return;
	}
	try {
		const tutor = await Tutor.findById(req.session.tutorID);
		if (!tutor) {
			res.status(403).json({ message: "Tutor account not found" });
			return;
		}
		req.currentTutor = tutor;
		next();
	} catch (error) {
		console.error("Error in validTutor middleware:", error);
		res.status(500).json({ message: "Server error while validating tutor" });
	}
};

// Middleware to validate Admin
export const validAdmin: RequestHandler = async (
	req,
	res,
	next
) => {
	if (!req.session?.adminID) {
		res.status(403).json({ message: "Not logged in or session expired" });
		return;
	}
	try {
		const admin = await Admin.findById(req.session.adminID);
		if (!admin) {
			res.status(403).json({ message: "Admin account not found" });
			return;
		}
		req.currentAdmin = admin;
		next();
	} catch (error) {
		console.error("Error in validAdmin middleware:", error);
		res.status(500).json({ message: "Server error while validating admin" });
	}
};

/**
 * Allow update/delete if:
 *  • adminID is in session, OR
 *  • tutorID in session matches the :tutorID param
 */
export const validTutorOrAdmin: RequestHandler = (req, res, next) => {
	const sess = req.session as any;
	const { tutorID } = req.params;

	// if admin, always OK
	if (sess.adminID) {
		return next();
	}

	// if tutor and it's their own ID
	if (sess.tutorID === tutorID) {
		return next();
	}

	res.status(403).json({ message: "Not authorized to perform this action." });
};
