// src/types/entities/ITutor.ts
import { IBaseUser } from "../abstractions/BaseUser";

export interface ITutor extends IBaseUser {
	age: string;
	state: string;
	usersOfTutorLength?: number;
	editTutors?: boolean;
	role: string; // e.g. "tutor"
}
