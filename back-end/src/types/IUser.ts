// src/types/IUser.ts

import { Document, Types } from "mongoose";

export interface IUser extends Document {
	_id: Types.ObjectId; // Explicitly define _id
	name: string;
	email: string;
	age: string;
	state: string;
	password: string;
	editUsers: boolean; // Non-optional because it has a default
	saveEdit: string;    // Non-optional because it has a default
	role: string;
	tutor?: Types.ObjectId; // Optional because of default
	comparePassword(password: string): Promise<boolean>;

	toJSON(): Record<string, unknown>;
}
