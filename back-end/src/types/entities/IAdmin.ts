// src/types/entities/IAdmin.ts
import type { IBaseUser } from "../abstractions/BaseUser";

export interface IAdmin extends IBaseUser {
	editAdmins: boolean; // admin-specific toggle
	role: string; // e.g. "admin"
}
