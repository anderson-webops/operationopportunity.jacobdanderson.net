// src/types/entities/IAdmin.ts
import type { IBaseUser } from "../abstractions/BaseUser.js";

export interface IAdmin extends IBaseUser {
	editAdmins: boolean;
	role: "admin";
}
