// src/controllers/tutorController.ts

import { RequestHandler } from "express";
import { Tutor } from "../models/Tutor";
import { ITutor } from "../types/ITutor";
import { User } from "../models/User";
import { Types } from "mongoose";

/**
 * Create a new tutor.
 */
export const createTutor: RequestHandler = async (req, res) => {
	const { name, email, age, state, password, editTutors, saveEdit } = req.body;

	// Validate required fields
	if (!name || !email || !age || !state || !password) {
		res.status(400).json({ message: "All fields (name, email, age, state, password) are required." });
		return;
	}

	try {
		// Check if email already exists in Tutor, User, or Admin collections
		const existingTutor = await Tutor.findOne({ email });
		const existingUser = await User.findOne({ email });
		// Optionally, check in Admins as well
		// const existingAdmin = await Admin.findOne({ email });

		if (existingTutor || existingUser /* || existingAdmin */) {
			res.status(403).json({ message: "Email already exists." });
			return;
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
			role: "tutor"
		});

		await tutor.save();

		// Set tutor session
		req.session.tutorID = (tutor._id as Types.ObjectId).toString();

		res.status(201).json({ currentTutor: tutor });
		return;
	} catch (error) {
		console.error("Error creating tutor:", error);
		res.status(500).json({ message: "Internal server error." });
		return;
	}
};

/**
 * Retrieve all tutors.
 */
export const getAllTutors: RequestHandler = async (_req, res) => {
	try {
		const tutors = await Tutor.find();
		res.status(200).json(tutors);
		return;
	} catch (error) {
		console.error("Error fetching tutors:", error);
		res.status(500).json({ message: "Internal server error." });
		return;
	}
};

/**
 * Update an existing tutor's information.
 */
export const updateTutor: RequestHandler = async (req, res) => {
	const { tutorID } = req.params;
	const { name, email, age, state, editTutors, saveEdit, password } = req.body;

	try {
		const tutor: ITutor | null = await Tutor.findById(tutorID);
		if (!tutor) {
			res.status(404).json({ message: "Tutor not found." });
			return;
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

		res.status(200).json({ message: "Tutor updated successfully." });
		return;
	} catch (error) {
		console.error("Error updating tutor:", error);
		res.status(500).json({ message: "Internal server error." });
		return;
	}
};

/**
 * Delete a tutor.
 */
export const deleteTutor: RequestHandler = async (req, res) => {
	const { tutorID } = req.params;

	try {
		const result = await Tutor.deleteOne({ _id: tutorID });

		if (result.deletedCount === 0) {
			res.status(404).json({ message: "Tutor not found." });
			return;
		}

		res.status(200).json({ message: "Tutor deleted successfully." });
		return;
	} catch (error) {
		console.error("Error deleting tutor:", error);
		res.status(500).json({ message: "Internal server error." });
		return;
	}
};
