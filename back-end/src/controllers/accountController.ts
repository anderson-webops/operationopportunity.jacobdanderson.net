// src/controllers/accountController.ts

import { Request, Response } from "express";
import { User } from "../models/User";
import { Tutor } from "../models/Tutor";
import { Admin } from "../models/Admin";
import { IUser } from "../types/IUser";
import { ITutor } from "../types/ITutor";
import { IAdmin } from "../types/IAdmin";
import { CustomSession } from "../types/CustomSession";

/**
 * Check if an email is already registered in any collection (User, Tutor, Admin).
 * Useful for account creation validation.
 */
export const checkEmail = async (req: Request, res: Response) => {
	const { email } = req.body;

	// Validate email presence
	if (!email) {
		return res.status(400).send({ message: "Email field is required." });
	}

	try {
		const existingUser = await User.findOne({ email });
		const existingTutor = await Tutor.findOne({ email });
		const existingAdmin = await Admin.findOne({ email });

		if (existingUser || existingTutor || existingAdmin) {
			return res.status(403).send({ message: "Email already exists." });
		}

		// Email is available
		return res.status(200).send({ message: "Email is available." });
	} catch (error) {
		console.error("Error checking email:", error);
		return res.status(500).send({ message: "Internal server error." });
	}
};

/**
 * Change the email of a user, tutor, or admin.
 */
export const changeEmail = async (req: Request, res: Response) => {
	const { ID } = req.params;
	const { email: newEmail } = req.body;

	// Validate email presence
	if (!newEmail) {
		return res.status(400).send({ message: "New email is required." });
	}

	try {
		// Find the user, tutor, or admin by ID
		const user: IUser | null = await User.findById(ID);
		const tutor: ITutor | null = await Tutor.findById(ID);
		const admin: IAdmin | null = await Admin.findById(ID);

		const entity = user || tutor || admin;

		if (!entity) {
			return res.status(404).send({ message: "Entity not found." });
		}

		// Check if the new email is already taken
		const existingUser = await User.findOne({ email: newEmail });
		const existingTutor = await Tutor.findOne({ email: newEmail });
		const existingAdmin = await Admin.findOne({ email: newEmail });

		if (existingUser || existingTutor || existingAdmin) {
			return res.status(403).send({ message: "Email already exists." });
		}

		// Update the email
		entity.email = newEmail;
		await entity.save();

		return res.status(200).send({ message: "Email updated successfully." });
	} catch (error) {
		console.error("Error changing email:", error);
		return res.status(500).send({ message: "Internal server error." });
	}
};

/**
 * Handle user, tutor, or admin login.
 */
export const login = async (req: Request, res: Response) => {
	const { email, password } = req.body;
	const session: CustomSession = req.session;

	// Validate presence of email and password
	if (!email || !password) {
		return res.status(400).send({ message: "Email and password are required." });
	}

	try {
		// Attempt to find the user in User, Tutor, and Admin collections
		const user = await User.findOne({ email });
		const tutor = await Tutor.findOne({ email });
		const admin = await Admin.findOne({ email });

		if (!user && !tutor && !admin) {
			return res.status(403).send({ message: "Email or password is incorrect." });
		}

		// Verify password for the found entity
		if (user && !(await user.comparePassword(password))) {
			return res.status(403).send({ message: "Email or password is incorrect." });
		}

		if (tutor && !(await tutor.comparePassword(password))) {
			return res.status(403).send({ message: "Email or password is incorrect." });
		}

		if (admin && !(await admin.comparePassword(password))) {
			return res.status(403).send({ message: "Email or password is incorrect." });
		}

		// Set session based on the entity type
		if (admin) {
			session.adminID = admin._id.toString();
			return res.status(200).send({ currentAdmin: admin });
		} else if (tutor) {
			session.tutorID = tutor._id.toString();
			return res.status(200).send({ currentTutor: tutor });
		} else if (user) {
			session.userID = user._id.toString();
			return res.status(200).send({ currentUser: user });
		} else {
			return res.status(403).send({ message: "Authentication failed." });
		}
	} catch (error) {
		console.error("Error during login:", error);
		return res.status(500).send({ message: "Internal server error." });
	}
};
