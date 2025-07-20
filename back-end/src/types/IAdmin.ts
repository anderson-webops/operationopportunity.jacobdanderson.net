// src/types/IAdmin.ts

import { Document, Types } from "mongoose";

export interface IAdmin extends Document {
	_id: Types.ObjectId; // Explicitly define _id
	name: string;
	email: string;
	password: string;
	editAdmins: boolean; // Non-optional because it has a default
	saveEdit: string;    // Non-optional because it has a default
	role: string;
	comparePassword(password: string): Promise<boolean>;
	toJSON(): Record<string, unknown>;
}
