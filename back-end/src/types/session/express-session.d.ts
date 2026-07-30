import type { IAdmin } from "../entities/IAdmin.js";
import type { ITutor } from "../entities/ITutor.js";
import type { IUser } from "../entities/IUser.js";
import type { AccountRole, Principal } from "../account.js";

declare module "express-session" {
	interface SessionData {
		identity?: {
			id: string;
			role: AccountRole;
			authVersion: number;
		};
		csrfToken?: string;
	}
}

declare global {
	namespace Express {
		interface Request {
			requestId?: string;
			currentPrincipal?: Principal;
			currentAdmin?: IAdmin;
			currentTutor?: ITutor;
			currentUser?: IUser;
		}
	}
}

export {};
