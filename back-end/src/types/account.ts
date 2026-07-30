import type { IAdmin } from "./entities/IAdmin.js";
import type { ITutor } from "./entities/ITutor.js";
import type { IUser } from "./entities/IUser.js";

export type AccountRole = "admin" | "tutor" | "user";
export type AccountDocument = IAdmin | ITutor | IUser;

export interface Principal {
	id: string;
	role: AccountRole;
	authVersion: number;
	account: AccountDocument;
}
