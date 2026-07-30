// src/models/schemas/Tutor.ts

import type { Model } from "mongoose";
import type { ITutor } from "../../types/entities/ITutor.js";
import mongoose, { Schema } from "mongoose";
import { normalizeEmail } from "../../validation.js";
import { immutableRolePlugin } from "../plugins/immutableRole.js";
import { passwordPlugin } from "../plugins/password.js";

/**
 * Create Mongoose Schema for Tutor
 */
const tutorSchema: Schema<ITutor> = new Schema(
	{
		name: { type: String, required: true, trim: true, maxlength: 100 },
		email: {
			type: String,
			required: true,
			unique: true,
			maxlength: 254,
			set: normalizeEmail
		},
		age: { type: String, maxlength: 3 },
		state: { type: String, trim: true, maxlength: 100 },
		password: {
			type: String,
			required(this: ITutor) {
				return this.isNew || this.isModified("password");
			},
			select: false
		},
		authVersion: { type: Number, default: 0, min: 0, required: true },
		status: {
			type: String,
			enum: ["pending", "active", "suspended"],
			default: "pending",
			required: true
		},
		role: { type: String, enum: ["tutor"], default: "tutor", required: true }
	},
	{ timestamps: true, strict: "throw" }
);

/**
 * Create and handle password hashing, comparison, and removal from JSON responses
 */
tutorSchema.plugin(immutableRolePlugin);
tutorSchema.plugin(passwordPlugin);

/**
 * Create and export Tutor model
 */
export const Tutor: Model<ITutor> = mongoose.model<ITutor>("Tutor", tutorSchema);
