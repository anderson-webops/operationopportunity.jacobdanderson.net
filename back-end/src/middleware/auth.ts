// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
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
export const validUser = async (
	req: UserRequest,
	res: Response,
	next: NextFunction
) => {
	if (!req.session?.userID) {
		return res.status(403).json({ message: "Not logged in or session expired" });
	}
	try {
		const user = await User.findById(req.session.userID);
		if (!user) {
			return res.status(403).json({ message: "User account not found" });
		}
		req.currentUser = user;
		next();
	} catch (error) {
		console.error("Error in validUser middleware:", error);
		res.status(500).json({ message: "Server error while validating user" });
	}
};

// Middleware to validate Tutor
export const validTutor = async (
	req: UserRequest,
	res: Response,
	next: NextFunction
) => {
	if (!req.session?.tutorID) {
		return res.status(403).json({ message: "Not logged in or session expired" });
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
		res.status(500).json({ message: "Server error while validating tutor" });
	}
};

// Middleware to validate Admin
export const validAdmin = async (
	req: UserRequest,
	res: Response,
	next: NextFunction
) => {
	if (!req.session?.adminID) {
		return res.status(403).json({ message: "Not logged in or session expired" });
	}
	try {
		const admin = await Admin.findById(req.session.adminID);
		if (!admin) {
			return res.status(403).json({ message: "Admin account not found" });
		}
		req.currentAdmin = admin;
		next();
	} catch (error) {
		console.error("Error in validAdmin middleware:", error);
		res.status(500).json({ message: "Server error while validating admin" });
	}
};
