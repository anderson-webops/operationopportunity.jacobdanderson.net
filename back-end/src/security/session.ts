import type { Request } from "express";
import type { AccountRole } from "../types/account.js";

export function regenerateSession(req: Request): Promise<void> {
	return new Promise((resolve, reject) => {
		req.session.regenerate(error => error ? reject(error) : resolve());
	});
}

export function saveSession(req: Request): Promise<void> {
	return new Promise((resolve, reject) => {
		req.session.save(error => error ? reject(error) : resolve());
	});
}

export function destroySession(req: Request): Promise<void> {
	return new Promise((resolve, reject) => {
		req.session.destroy(error => error ? reject(error) : resolve());
	});
}

export function setSessionIdentity(
	req: Request,
	role: AccountRole,
	id: string,
	authVersion: number
) {
	req.session.identity = { role, id, authVersion };
}
