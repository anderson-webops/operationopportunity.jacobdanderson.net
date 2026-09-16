import argon2 from "argon2";
import { HttpError } from "./errors.js";

/** Bound native Argon2 memory and queued secrets without weakening hash cost. */
export class PasswordCapacity {
	private active = 0;
	private readonly waiting: Array<() => void> = [];
	constructor(
		private readonly concurrency = 2,
		private readonly maxWaiting = 32
	) {}

	async run<T>(operation: () => Promise<T>): Promise<T> {
		if (this.active >= this.concurrency) {
			if (this.waiting.length >= this.maxWaiting) {
				throw new HttpError(503, "authentication_busy", "Authentication is temporarily busy. Please retry.");
			}
			await new Promise<void>((resolve) => this.waiting.push(resolve));
		} else {
			this.active++;
		}
		try {
			return await operation();
		} finally {
			const next = this.waiting.shift();
			if (next) next();
			else this.active--;
		}
	}
}

export const passwordCapacity = new PasswordCapacity();
export function hashPassword(password: string): Promise<string> {
	return passwordCapacity.run(() =>
		argon2.hash(password, {
			type: argon2.argon2id,
			memoryCost: 65536,
			timeCost: 3,
			parallelism: 1
		})
	);
}
export function verifyPassword(hash: string, password: string): Promise<boolean> {
	return passwordCapacity.run(() => argon2.verify(hash, password));
}
