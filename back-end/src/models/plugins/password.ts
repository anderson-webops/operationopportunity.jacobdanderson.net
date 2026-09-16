// src/models/plugins/password.ts
import type { Document, Schema } from "mongoose";
import { hashPassword, verifyPassword } from "../../passwordWork.js";

export function passwordPlugin<T extends Document & { password: string }>(schema: Schema<T>) {
	schema.pre("save", async function (this: T) {
		if (!this.isModified("password")) return;
		this.password = await hashPassword(this.password);
	});

	schema.methods.comparePassword = function (pw: string) {
		// this.password is guaranteed to exist
		return verifyPassword(this.password, pw);
	};

	schema.methods.toJSON = function () {
		const obj = this.toObject();
		delete obj.password;
		delete obj.__v;
		return obj;
	};
}
