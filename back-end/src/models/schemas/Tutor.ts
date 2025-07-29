// src/models/schemas/Tutor.ts

import type { Model } from "mongoose";
import type { ITutor } from "../../types/entities/ITutor";
import mongoose, { Schema } from "mongoose";
import { passwordPlugin } from "../plugins/password";

/**
 * Create Mongoose Schema for Tutor
 */
const tutorSchema: Schema<ITutor> = new Schema(
	{
		name: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		age: { type: String },
		state: { type: String },
		password: { type: String, required: true },
		usersOfTutorLength: { type: Number, default: 0 },
		editTutors: { type: Boolean, default: false },
		saveEdit: { type: String, default: "Edit" },
		role: { type: String, default: "tutor" }
	},
	{ timestamps: true }
);

/**
 * Create and handle password hashing, comparison, and removal from JSON responses
 */
tutorSchema.plugin(passwordPlugin);

/**
 * Create and export Tutor model
 */
export const Tutor: Model<ITutor> = mongoose.model<ITutor>("Tutor", tutorSchema);
