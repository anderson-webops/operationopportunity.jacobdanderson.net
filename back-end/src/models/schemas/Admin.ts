// src/models/schemas/Admin.ts

import mongoose, { Model, Schema } from "mongoose";
import { IAdmin } from "../../types/entities/IAdmin";
import { passwordPlugin } from '../plugins/password';

/**
 * Create Mongoose Schema for Admin
 */
const adminSchema: Schema<IAdmin> = new Schema(
	{
		name: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		editAdmins: { type: Boolean, default: false, required: true }, // Added required: true
		saveEdit: { type: String, default: "Edit", required: true },    // Added required: true
		role: { type: String, default: "admin" }
	},
	{ timestamps: true }
);

/**
 * Create and handle password hashing, comparison, and removal from JSON responses
 */
adminSchema.plugin(passwordPlugin);

/**
 * Create and export Admin model
 */
export const Admin: Model<IAdmin> = mongoose.model<IAdmin>("Admin", adminSchema);
