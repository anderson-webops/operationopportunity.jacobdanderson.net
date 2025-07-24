// src/types/session/CustomSession.ts
import { Session } from "express-session";

export interface CustomSession extends Session {
	userID?: string;
	tutorID?: string;
	adminID?: string;
}
