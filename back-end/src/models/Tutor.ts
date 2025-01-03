// src/models/Tutor.ts
import mongoose, { Schema } from "mongoose";
import { ITutor } from "../types/ITutor";
import argon2 from "argon2";
import { hashPasswordIfModified } from "../utils/hashPasswordHelper";

const tutorSchema: Schema<ITutor> = new Schema({
	name: { type: String, required: true },
	email: { type: String, required: true, unique: true }, // Ensure unique emails
	age: { type: String, required: true },
	state: { type: String, required: true },
	password: { type: String, required: true },
	usersOfTutorLength: { type: Number, required: true, default: 0 },
	editTutors: { type: Boolean, required: true, default: false },
	saveEdit: { type: String, required: true, default: "Edit" },
	role: { type: String, default: "tutor" },
});

// Apply pre-save hook
tutorSchema.pre<ITutor>("save", hashPasswordIfModified);

// Compare password method
tutorSchema.methods.comparePassword = async function (
	candidatePassword: string
): Promise<boolean> {
	try {
		return await argon2.verify(this.password, candidatePassword);
	} catch {
		return false;
	}
};

// Remove password from JSON
tutorSchema.methods.toJSON = function () {
	const obj = this.toObject();
	delete obj.password;
	return obj;
};

export const Tutor = mongoose.model<ITutor>("Tutor", tutorSchema);
