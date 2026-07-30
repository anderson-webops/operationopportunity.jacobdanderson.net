// src/models/schemas/Admin.ts

import type { Model } from "mongoose";
import type { IAdmin } from "../../types/entities/IAdmin.js";
import mongoose, { Schema } from "mongoose";
import { normalizeEmail } from "../../validation.js";
import { immutableRolePlugin } from "../plugins/immutableRole.js";
import { passwordPlugin } from "../plugins/password.js";

/**
 * Create Mongoose Schema for Admin
 */
const adminSchema: Schema<IAdmin> = new Schema(
	{
		name: { type: String, required: true, trim: true, maxlength: 100 },
		email: {
			type: String,
			required: true,
			unique: true,
			maxlength: 254,
			set: normalizeEmail
		},
		password: {
			type: String,
			required(this: IAdmin) {
				return this.isNew || this.isModified("password");
			},
			select: false
		},
		authVersion: { type: Number, default: 0, min: 0, required: true },
		editAdmins: { type: Boolean, default: false, required: true },
		role: { type: String, enum: ["admin"], default: "admin", required: true }
	},
	{ timestamps: true, strict: "throw" }
);

/**
 * Create and handle password hashing, comparison, and removal from JSON responses
 */
adminSchema.plugin(immutableRolePlugin);
adminSchema.plugin(passwordPlugin);

/**
 * Create and export Admin model
 */
export const Admin: Model<IAdmin> = mongoose.model<IAdmin>("Admin", adminSchema);
