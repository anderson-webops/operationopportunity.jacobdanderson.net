// src/controllers/tutorController.ts

import { Request, Response } from "express";
import { Tutor } from "../models/Tutor";
import { ITutor } from "../types/ITutor";
import { User } from "../models/User";
import { IUser } from "../types/IUser";
import { UserRequest } from "../middleware/auth";

/**
 * Create a new tutor.
 */
export const createTutor = async (req: UserRequest, res: Response) => {
	const { name, email, age, state, password, editTutors, saveEdit } = req.body;

	// Validate required fields
	if (!name || !email || !age || !state || !password) {
		return res.status(400).send({ message: "All fields (name, email, age, state, password) are required." });
	}

	try {
		// Check if email already exists in Tutor, User, or Admin collections
		const existingTutor = await Tutor.findOne({ email });
		const existingUser = await User.findOne({ email });
		// Optionally, check in Admins as well
		// const existingAdmin = await Admin.findOne({ email });

		if (existingTutor || existingUser /* || existingAdmin */) {
			return res.status(403).send({ message: "Email already exists." });
		}

		// Create new tutor
		const tutor: ITutor = new Tutor({
			name,
			email,
			age,
			state,
			password,
			editTutors: editTutors ?? false,
			saveEdit: saveEdit ?? "Edit",
			role: "tutor",
		});

		await tutor.save();

		// Set tutor session
		req.session.tutorID = tutor._id.toString();

		return res.status(201).send({ currentTutor: tutor });
	} catch (error) {
		console.error("Error creating tutor:", error);
		return res.status(500).send({ message: "Internal server error." });
	}
};

/**
 * Retrieve all tutors.
 */
export const getAllTutors = async (_req: Request, res: Response) => {
	try {
		const tutors = await Tutor.find();
		return res.status(200).send(tutors);
	} catch (error) {
		console.error("Error fetching tutors:", error);
		return res.status(500).send({ message: "Internal server error." });
	}
};

/**
 * Update an existing tutor's information.
 */
export const updateTutor = async (req: UserRequest, res: Response) => {
	const { tutorID } = req.params;
	const { name, email, age, state, editTutors, saveEdit, password } = req.body;

	try {
		const tutor: ITutor | null = await Tutor.findById(tutorID);
		if (!tutor) {
			return res.status(404).send({ message: "Tutor not found." });
		}

		// Update fields if provided
		if (name) tutor.name = name;
		if (email) tutor.email = email;
		if (age) tutor.age = age;
		if (state) tutor.state = state;
		if (typeof editTutors !== "undefined") tutor.editTutors = editTutors;
		if (saveEdit) tutor.saveEdit = saveEdit;
		if (password) tutor.password = password; // Triggers pre-save hook for hashing

		await tutor.save();

		return res.status(200).send({ message: "Tutor updated successfully." });
	} catch (error) {
		console.error("Error updating tutor:", error);
		return res.status(500).send({ message: "Internal server error." });
	}
};

/**
 * Delete a tutor.
 */
export const deleteTutor = async (req: UserRequest, res: Response) => {
	const { tutorID } = req.params;

	try {
		const result = await Tutor.deleteOne({ _id: tutorID });

		if (result.deletedCount === 0) {
			return res.status(404).send({ message: "Tutor not found." });
		}

		return res.status(200).send({ message: "Tutor deleted successfully." });
	} catch (error) {
		console.error("Error deleting tutor:", error);
		return res.status(500).send({ message: "Internal server error." });
	}
};
