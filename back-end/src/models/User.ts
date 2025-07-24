// models/User.ts

import mongoose, { Model, Schema } from "mongoose";
import argon2 from "argon2";
import { IUser } from "../types/IUser";

/**
 * 1. Define an interface for the User document
 */

/**
 * 2. Create Mongoose Schema for User
 */
const userSchema: Schema<IUser> = new Schema(
	{
		tutor: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Tutor",
			default: null
		},
		name: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		age: { type: String },
		state: { type: String },
		password: { type: String, required: true },
		editUsers: { type: Boolean, default: false, required: true }, // Added required: true
		saveEdit: { type: String, default: "Edit", required: true },    // Added required: true
		role: { type: String, default: "user" }
	},
	{ timestamps: true }
);

/**
 * 3. Pre-save hook to hash the password if modified
 */
userSchema.pre<IUser>("save", async function(next) {
	if (!this.isModified("password")) return next();
	try {
		this.password = await argon2.hash(this.password);
		next();
	} catch (error) {
		console.error(`Error: ${error}`);
		// next(error); // Ensure the error is propagated
	}
});

/**
 * 4. Method to compare password
 */
userSchema.methods.comparePassword = async function(
	password: string
): Promise<boolean> {
	try {
		return await argon2.verify(this.password, password);
	} catch (error) {
		console.error(`Error: ${error}`);
		return false;
	}
};

/**
 * 5. Method to remove password from JSON responses
 */
userSchema.methods.toJSON = function() {
	const obj = this.toObject();
	delete obj.password;
	return obj;
};

/**
 * 6. Create and export User model
 */
export const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
