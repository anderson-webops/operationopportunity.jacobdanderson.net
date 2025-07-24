// src/controllers/accountController.ts

import { RequestHandler } from "express";
import { User } from "../models/User";
import { Tutor } from "../models/Tutor";
import { Admin } from "../models/Admin";
import { IUser } from "../types/IUser";
import { ITutor } from "../types/ITutor";
import { IAdmin } from "../types/IAdmin";
import { CustomSession } from "../types/CustomSession";
import { Types } from "mongoose";

/**
 * Check if an email is already registered in any collection (User, Tutor, Admin).
 * Useful for account creation validation.
 */
export const checkEmail: RequestHandler = async (req, res) => {
	try {
		// 1) pull `id` (lowercase) out of the body and rename it to ID
		//    (make sure your front-end is actually sending `id`)
		const { id: ID, email } = req.body as { id?: string; email?: string };

		if (!email) {
			return res.status(400).json({ message: "Email field is required." });
		}

		// 2) use `.exec()` so TS knows these return real Promises of your doc types
		const existingUser = await User.findOne({ email }).exec() as IUser | null;
		const existingTutor = await Tutor.findOne({ email }).exec() as ITutor | null;
		const existingAdmin = await Admin.findOne({ email }).exec() as IAdmin | null;

		// 3) if any of them exists *and* isn’t *you* (i.e. _id ≠ ID), it’s a conflict
		if (
			(existingUser && existingUser._id.toString() !== ID) ||
			(existingTutor && existingTutor._id.toString() !== ID) ||
			(existingAdmin && existingAdmin._id.toString() !== ID)
		) {
			return res.status(403).json({ message: "Email already exists." });
		}

		return res.status(200).json({ message: "Email is available." });
	} catch (error) {
		console.error("Error checking email:", error);
		return res.status(500).json({ message: "Internal server error." });
	}
};

/**
 * Change the email of a user, tutor, or admin.
 */
export const changeEmail: RequestHandler = async (req, res) => {
	const { ID } = req.params;
	const { email: newEmail } = req.body;

	// Validate email presence
	if (!newEmail) {
		res.status(400).json({ message: "New email is required." });
		return;
	}

	try {
		// Find the user, tutor, or admin by ID
		const user: IUser | null = await User.findById(ID);
		const tutor: ITutor | null = await Tutor.findById(ID);
		const admin: IAdmin | null = await Admin.findById(ID);

		const entity = user || tutor || admin;

		if (!entity) {
			res.status(404).json({ message: "Entity not found." });
			return;
		}

		// Check if the new email is already taken
		const existingUser = await User.findOne({ email: newEmail });
		const existingTutor = await Tutor.findOne({ email: newEmail });
		const existingAdmin = await Admin.findOne({ email: newEmail });

		if (existingUser || existingTutor || existingAdmin) {
			res.status(403).json({ message: "Email already exists." });
			return;
		}

		// Update the email
		entity.email = newEmail;
		await entity.save();

		res.status(200).json({ message: "Email updated successfully." });
		return;
	} catch (error) {
		console.error("Error changing email:", error);
		res.status(500).json({ message: "Internal server error." });
		return;
	}
};

/**
 * Handle user, tutor, or admin login.
 */
export const login: RequestHandler = async (req, res) => {
	const { email, password } = req.body;
	const session: CustomSession = req.session;

	// Validate presence of email and password
	if (!email || !password) {
		res.status(400).json({ message: "Email and password are required." });
		return;
	}

	try {
		// Attempt to find the user in User, Tutor, and Admin collections
		const user = await User.findOne({ email });
		const tutor = await Tutor.findOne({ email });
		const admin = await Admin.findOne({ email });

		if (!user && !tutor && !admin) {
			res.status(403).json({ message: "Email or password is incorrect." });
			return;
		}

		// Verify password for the found entity
		if (user && !(await user.comparePassword(password))) {
			res.status(403).json({ message: "Email or password is incorrect." });
			return;
		}

		if (tutor && !(await tutor.comparePassword(password))) {
			res.status(403).json({ message: "Email or password is incorrect." });
			return;
		}

		if (admin && !(await admin.comparePassword(password))) {
			res.status(403).json({ message: "Email or password is incorrect." });
			return;
		}

		// Set session based on the entity type
		if (admin) {
			session.adminID = admin._id.toString();
			res.status(200).json({ currentAdmin: admin });
			return;
		} else if (tutor) {
			session.tutorID = (tutor._id as Types.ObjectId).toString();
			res.status(200).json({ currentTutor: tutor });
			return;
		} else if (user) {
			session.userID = user._id.toString();
			res.status(200).json({ currentUser: user });
			return;
		} else {
			res.status(403).json({ message: "Authentication failed." });
			return;
		}
	} catch (error) {
		console.error("Error during login:", error);
		res.status(500).json({ message: "Internal server error." });
		return;
	}
};
