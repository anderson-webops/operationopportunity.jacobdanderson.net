// src/types/ITutor.ts
import { Document } from "mongoose";

export interface ITutor extends Document {
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
}
