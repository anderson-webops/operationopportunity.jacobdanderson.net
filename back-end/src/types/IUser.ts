// src/types/IUser.ts
import { Document, Schema } from "mongoose";

export interface IUser extends Document {
	name: string;
	email: string;
	age: number;
	state: string;
	password: string;
	editUsers?: boolean;
	saveEdit?: boolean;
	role: string;
	tutor?: Schema.Types.ObjectId;
	comparePassword(candidatePassword: string): Promise<boolean>;
}
