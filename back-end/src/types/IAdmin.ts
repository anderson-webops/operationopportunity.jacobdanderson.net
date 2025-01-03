// src/types/IAdmin.ts
import { Document } from "mongoose";

export interface IAdmin extends Document {
	name: string;
	email: string;
	password: string;
	editAdmins: boolean;
	saveEdit: string;
	role: string;
	comparePassword(password: string): Promise<boolean>;
}
