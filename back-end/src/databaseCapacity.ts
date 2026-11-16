import type { ConnectOptions, Schema } from "mongoose";
import { readRequestSignal } from "./runtimeCapacity.js";

export const DATABASE_OPTIONS: ConnectOptions = {
	serverSelectionTimeoutMS: 8000,
	connectTimeoutMS: 8000,
	maxPoolSize: 20,
	minPoolSize: 0,
	maxConnecting: 2,
	maxIdleTimeMS: 60000,
	socketTimeoutMS: 5000,
	waitQueueTimeoutMS: 1000
};

/** Abandon only reads. Accepted mutation workflows retain their write/audit path. */
export function readCancellationPlugin(schema: Schema) {
	for (const operation of ["find", "findOne", "countDocuments", "estimatedDocumentCount", "distinct"] as const) {
		schema.pre(operation, function () {
			const request = readRequestSignal();
			const existing = this.getOptions().signal as AbortSignal | undefined;
			const signal =
				request && existing && request !== existing
					? AbortSignal.any([request, existing])
					: (request ?? existing);
			signal?.throwIfAborted();
			if (signal) {
				this.setOptions({ signal });
			}
		});
	}
}

export function singleFlightReadiness(check: (signal: AbortSignal) => Promise<boolean>, timeoutMs = 1500) {
	let pending: Promise<boolean> | undefined;
	return () => {
		if (!pending) {
			const result = Promise.withResolvers<boolean>();
			const controller = new AbortController();
			pending = result.promise;
			const timer = setTimeout(() => {
				controller.abort(new Error("Database readiness deadline exceeded"));
				result.resolve(false);
			}, timeoutMs);
			void Promise.resolve()
				.then(() => {
					controller.signal.throwIfAborted();
					return check(controller.signal);
				})
				.then(result.resolve, () => result.resolve(false))
				.finally(() => {
					clearTimeout(timer);
					if (pending === result.promise) pending = undefined;
				});
		}
		return pending;
	};
}
