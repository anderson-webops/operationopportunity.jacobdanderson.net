import type { Types } from "mongoose";
// src/types/entities/IUser.ts
import type { IBaseUser } from "../abstractions/BaseUser";

export interface IUser extends IBaseUser {
	age: string;
	state: string;
	tutor?: Types.ObjectId;
	editUsers: boolean;
	role: string; // e.g. "user"
}
