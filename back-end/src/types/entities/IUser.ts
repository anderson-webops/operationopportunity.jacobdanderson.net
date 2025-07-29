// src/types/entities/IUser.ts
import { IBaseUser } from "../abstractions/BaseUser";
import { Types } from "mongoose";

export interface IUser extends IBaseUser {
	age: string;
	state: string;
	tutor?: Types.ObjectId;
	editUsers: boolean;
	role: string; // e.g. "user"
}
