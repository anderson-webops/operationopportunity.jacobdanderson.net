// src/models/schemas/User.ts

import type { Model } from "mongoose";
import type { IUser } from "../../types/entities/IUser.js";
import mongoose, { Schema } from "mongoose";
import { normalizeEmail } from "../../validation.js";
import { immutableRolePlugin } from "../plugins/immutableRole.js";
import { passwordPlugin } from "../plugins/password.js";

/**
 * Create Mongoose Schema for User
 */
const userSchema: Schema<IUser> = new Schema(
	{
		tutor: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Tutor",
			default: null
		},
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
			required(this: IUser) {
				return this.isNew || this.isModified("password");
			},
			select: false
		},
		authVersion: { type: Number, default: 0, min: 0, required: true },
		role: { type: String, enum: ["user"], default: "user", required: true }
	},
	{ timestamps: true, strict: "throw", optimisticConcurrency: true }
);

/**
 * Create and handle password hashing, comparison, and removal from JSON responses
 */
userSchema.plugin(immutableRolePlugin);
userSchema.plugin(passwordPlugin);

/**
 * Create and export Tutor model
 */
export const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
