// src/controllers/adminController.ts

import { Request, Response } from "express";
import { Admin } from "../models/Admin";
import { IAdmin } from "../types/IAdmin";
import { User } from "../models/User";
import { Tutor } from "../models/Tutor";
import { UserRequest } from "../middleware/auth";

/**
 * Create a new admin.
 */
export const createAdmin = async (req: UserRequest, res: Response) => {
	const { name, email, password, editAdmins, saveEdit } = req.body;

	// Validate required fields
	if (!name || !email || !password) {
		return res.status(400).send({ message: "All fields (name, email, password) are required." });
	}

	try {
		// Check if email already exists in Admin, User, or Tutor collections
		const existingAdmin = await Admin.findOne({ email });
		const existingUser = await User.findOne({ email });
		const existingTutor = await Tutor.findOne({ email });

		if (existingAdmin || existingUser || existingTutor) {
			return res.status(403).send({ message: "Email already exists." });
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

		return res.status(201).send({ currentAdmin: admin });
	} catch (error) {
		console.error("Error creating admin:", error);
		return res.status(500).send({ message: "Internal server error." });
	}
};

/**
 * Retrieve all admins.
 */
export const getAllAdmins = async (_req: Request, res: Response) => {
	try {
		const admins = await Admin.find();
		return res.status(200).send(admins);
	} catch (error) {
		console.error("Error fetching admins:", error);
		return res.status(500).send({ message: "Internal server error." });
	}
};

/**
 * Update an existing admin's information.
 */
export const updateAdmin = async (req: UserRequest, res: Response) => {
	const { adminID } = req.params;
	const { name, email, editAdmins, saveEdit, password } = req.body;

	try {
		const admin: IAdmin | null = await Admin.findById(adminID);
		if (!admin) {
			return res.status(404).send({ message: "Admin not found." });
		}

		// Update fields if provided
		if (name) admin.name = name;
		if (email) admin.email = email;
		if (typeof editAdmins !== "undefined") admin.editAdmins = editAdmins;
		if (saveEdit) admin.saveEdit = saveEdit;
		if (password) admin.password = password; // Triggers pre-save hook for hashing

		await admin.save();

		return res.status(200).send({ message: "Admin updated successfully." });
	} catch (error) {
		console.error("Error updating admin:", error);
		return res.status(500).send({ message: "Internal server error." });
	}
};

/**
 * Delete an admin.
 */
export const deleteAdmin = async (req: UserRequest, res: Response) => {
	const { adminID } = req.params;

	try {
		const result = await Admin.deleteOne({ _id: adminID });

		if (result.deletedCount === 0) {
			return res.status(404).send({ message: "Admin not found." });
		}

		return res.status(200).send({ message: "Admin deleted successfully." });
	} catch (error) {
		console.error("Error deleting admin:", error);
		return res.status(500).send({ message: "Internal server error." });
	}
};

/**
 * Retrieve the currently logged-in admin.
 */
export const getLoggedInAdmin = async (req: UserRequest, res: Response) => {
	try {
		if (req.currentAdmin) {
			return res.status(200).send({ currentAdmin: req.currentAdmin });
		} else {
			return res.status(404).send({ message: "No admin is currently logged in." });
		}
	} catch (error) {
		console.error("Error fetching logged-in admin:", error);
		return res.status(500).send({ message: "Internal server error." });
	}
};
