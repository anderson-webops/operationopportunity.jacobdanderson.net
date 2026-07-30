// src/types/abstractions/BaseUser.ts
import type { Document, Types } from "mongoose";

export interface IBaseUser extends Document {
	_id: Types.ObjectId;
	name: string;
	email: string;
	password: string;
	authVersion: number;

	comparePassword: (password: string) => Promise<boolean>;

	toJSON: () => Record<string, unknown>;
}
