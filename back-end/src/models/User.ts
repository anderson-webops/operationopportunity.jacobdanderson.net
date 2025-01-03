// src/models/User.ts
import mongoose, { Schema } from "mongoose";
import { IUser } from "../types/IUser";
import argon2 from "argon2";
import { hashPasswordIfModified } from "../utils/hashPasswordHelper";

const userSchema: Schema<IUser> = new Schema({
	name: { type: String, required: true },
	email: { type: String, required: true, unique: true }, // Ensure unique emails
	age: { type: Number, required: true },
	state: { type: String, required: true },
	password: { type: String, required: true },
	editUsers: { type: Boolean, default: false },
	saveEdit: { type: Boolean, default: false },
	role: { type: String, default: "user" },
	tutor: { type: Schema.Types.ObjectId, ref: "Tutor", default: null },
});

// Apply pre-save hook
userSchema.pre<IUser>("save", hashPasswordIfModified);

// Compare password method
userSchema.methods.comparePassword = async function (
	candidatePassword: string
): Promise<boolean> {
	try {
		return await argon2.verify(this.password, candidatePassword);
	} catch {
		return false;
	}
};

// Remove password from JSON
userSchema.methods.toJSON = function () {
	const obj = this.toObject();
	delete obj.password;
	return obj;
};

export const User = mongoose.model<IUser>("User", userSchema);
