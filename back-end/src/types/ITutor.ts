// src/types/ITutor.ts
import { Document, Types } from "mongoose";

export interface ITutor extends Document {
	_id: Types.ObjectId; // Explicitly define _id
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
