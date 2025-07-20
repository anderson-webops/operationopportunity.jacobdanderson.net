// models/Tutor.ts

import mongoose, { Document, Schema, Model } from "mongoose";
import argon2 from "argon2";

// 1. Define an interface for the Tutor document
export interface ITutor extends Document {
	name: string;
	email: string;
	age: string;
	state: string;
	password: string;
	usersOfTutorLength?: number;
	editTutors?: boolean;
	saveEdit?: string;
	role: string;
	comparePassword(password: string): Promise<boolean>;
	toJSON(): Record<string, unknown>;
}

// 2. Create Mongoose Schema for Tutor
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
		role: { type: String, default: "tutor" },
	},
	{ timestamps: true }
);

// 3. Pre-save hook to hash the password if modified
tutorSchema.pre<ITutor>("save", async function (next) {
	if (!this.isModified("password")) return next();
	try {
		this.password = await argon2.hash(this.password);
		next();
	} catch (error) {
		console.error(`Error: ${error}`);
		// next(error);
	}
});

// 4. Method to compare password
tutorSchema.methods.comparePassword = async function (
	password: string
): Promise<boolean> {
	try {
		return await argon2.verify(this.password, password);
	} catch (error) {
		console.error(`Error: ${error}`);
		return false;
	}
};

// 5. Method to remove password from JSON responses
tutorSchema.methods.toJSON = function () {
	const obj = this.toObject();
	delete obj.password;
	return obj;
};

// 6. Create and export Tutor model
export const Tutor: Model<ITutor> = mongoose.model<ITutor>("Tutor", tutorSchema);
