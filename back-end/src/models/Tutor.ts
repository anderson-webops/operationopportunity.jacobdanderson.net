// models/Tutor.ts

import mongoose, { Model, Schema } from "mongoose";
import argon2 from "argon2";
import { ITutor } from "../types/ITutor";

// 1. Create Mongoose Schema for Tutor
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

// 2. Pre-save hook to hash the password if modified
tutorSchema.pre<ITutor>("save", async function(next) {
	if (!this.isModified("password")) return next();
	try {
		this.password = await argon2.hash(this.password);
		next();
	} catch (error) {
		console.error(`Error: ${error}`);
		// next(error);
	}
});

// 3. Method to compare password
tutorSchema.methods.comparePassword = async function(
	password: string
): Promise<boolean> {
	try {
		return await argon2.verify(this.password, password);
	} catch (error) {
		console.error(`Error: ${error}`);
		return false;
	}
};

// 4. Method to remove password from JSON responses
tutorSchema.methods.toJSON = function() {
	const obj = this.toObject();
	delete obj.password;
	return obj;
};

// 5. Create and export Tutor model
export const Tutor: Model<ITutor> = mongoose.model<ITutor>("Tutor", tutorSchema);
