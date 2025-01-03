import argon2 from "argon2";
import { Document } from "mongoose";

async function hashPasswordIfModified<T extends Document>(
	this: T,
	next: (err?: any) => void
) {
	if (!this.isModified("password")) return next();
	try {
		this.password = await argon2.hash(this.password);
		next();
	} catch (error) {
		console.error(`Error: ${error}`);
		next(error instanceof Error ? error : new Error("An unknown error occurred"));
	}
}

export { hashPasswordIfModified };
