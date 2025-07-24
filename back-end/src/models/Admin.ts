// models/Admin.ts

import mongoose, { Model, Schema } from "mongoose";
import argon2 from "argon2";
import { IAdmin } from "../types/IAdmin";

/**
 * 2. Create Mongoose Schema for Admin
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
 * 3. Pre-save hook to hash the password if modified
 */
adminSchema.pre<IAdmin>("save", async function(next) {
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
adminSchema.methods.comparePassword = async function(
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
adminSchema.methods.toJSON = function() {
	const obj = this.toObject();
	delete obj.password;
	return obj;
};

/**
 * 6. Create and export Admin model
 */
export const Admin: Model<IAdmin> = mongoose.model<IAdmin>("Admin", adminSchema);
