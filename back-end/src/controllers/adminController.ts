// src/controllers/adminController.ts

import { RequestHandler } from "express";
import { Admin } from "../models/Admin";
import { User } from "../models/User";
import { Tutor } from "../models/Tutor";
import { IAdmin } from "../types/IAdmin";

/**
 * Create a new admin.
 */
export const createAdmin: RequestHandler = async (req, res) => {
	const { name, email, password, editAdmins, saveEdit } = req.body;

	// Validate required fields
	if (!name || !email || !password) {
		res.status(400).json({ message: "All fields (name, email, password) are required." });
		return;
	}

	try {
		// Check if email already exists in Admin, User, or Tutor collections
		const [existingAdmin, existingUser, existingTutor] = await Promise.all([
			Admin.findOne({ email }),
			User.findOne({ email }),
			Tutor.findOne({ email }),
		]);

		if (existingAdmin || existingUser || existingTutor) {
			res.status(403).json({ message: "Email already exists." });
			return;
		}

		// Create new admin
		const admin: IAdmin = new Admin({
			name,
			email,
			password,
			editAdmins: editAdmins ?? false,
			saveEdit: saveEdit ?? "Edit",
			role: "admin",
		});

		await admin.save();

		// Set admin session
		req.session.adminID = admin._id.toString();

		res.status(201).json({ currentAdmin: admin });
		return;
	} catch (error) {
		console.error("Error creating admin:", error);
		res.status(500).json({ message: "Internal server error." });
		return;
	}
};

/**
 * Retrieve all admins.
 */
export const getAllAdmins: RequestHandler = async (_req, res) => {
	try {
		const admins: IAdmin[] = await Admin.find();
		res.status(200).json(admins);
		return;
	} catch (error) {
		console.error("Error fetching admins:", error);
		res.status(500).json({ message: "Internal server error." });
		return;
	}
};

/**
 * Update an existing admin's information.
 */
export const updateAdmin: RequestHandler = async (req, res) => {
	const { adminID } = req.params;
	const { name, email, editAdmins, saveEdit, password } = req.body;

	try {
		const admin: IAdmin | null = await Admin.findById(adminID);
		if (!admin) {
			res.status(404).json({ message: "Admin not found." });
			return;
		}

		// Update fields if provided
		if (name) admin.name = name;
		if (email) admin.email = email;
		if (typeof editAdmins !== "undefined") admin.editAdmins = editAdmins;
		if (saveEdit) admin.saveEdit = saveEdit;
		if (password) admin.password = password; // Triggers pre-save hook for hashing

		await admin.save();

		res.status(200).json({ message: "Admin updated successfully." });
		return;
	} catch (error) {
		console.error("Error updating admin:", error);
		res.status(500).json({ message: "Internal server error." });
		return;
	}
};

/**
 * Delete an admin.
 */
export const deleteAdmin: RequestHandler = async (req, res) => {
	const { adminID } = req.params;

	try {
		const result = await Admin.deleteOne({ _id: adminID });

		if (result.deletedCount === 0) {
			res.status(404).json({ message: "Admin not found." });
			return;
		}

		res.status(200).json({ message: "Admin deleted successfully." });
		return;
	} catch (error) {
		console.error("Error deleting admin:", error);
		res.status(500).json({ message: "Internal server error." });
		return;
	}
};

/**
 * Retrieve the currently logged-in admin.
 */
export const getLoggedInAdmin: RequestHandler = async (req, res) => {
	try {
		if (req.currentAdmin) {
			res.status(200).json({ currentAdmin: req.currentAdmin });
			return;
		} else {
			res.status(404).json({ message: "No admin is currently logged in." });
			return;
		}
	} catch (error) {
		console.error("Error fetching logged-in admin:", error);
		res.status(500).json({ message: "Internal server error." });
		return;
	}
};
