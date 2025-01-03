// src/models/Admin.ts
import mongoose, { Schema } from "mongoose";
import { IAdmin } from "../types/IAdmin";
import argon2 from "argon2";
import { hashPasswordIfModified } from "../utils/hashPasswordHelper";

const adminSchema: Schema<IAdmin> = new Schema({
	name: { type: String, required: true },
	email: { type: String, required: true, unique: true }, // Ensure unique emails
	password: { type: String, required: true },
	editAdmins: { type: Boolean, required: true, default: false },
	saveEdit: { type: String, required: true, default: "Edit" },
	role: { type: String, default: "admin" },
});

// Apply pre-save hook
adminSchema.pre<IAdmin>("save", hashPasswordIfModified);

// Compare password method
adminSchema.methods.comparePassword = async function (
	password: string
): Promise<boolean> {
	try {
		return await argon2.verify(this.password, password);
	} catch {
		return false;
	}
};

// Remove password from JSON
adminSchema.methods.toJSON = function () {
	const obj = this.toObject();
	delete obj.password;
	return obj;
};

export const Admin = mongoose.model<IAdmin>("Admin", adminSchema);
