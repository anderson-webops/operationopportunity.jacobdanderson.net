import type { ConnectOptions, Schema } from "mongoose";
import { readRequestSignal } from "./runtimeCapacity.js";

export const DATABASE_OPTIONS: ConnectOptions = {
	serverSelectionTimeoutMS: 8000,
	connectTimeoutMS: 8000,
	maxPoolSize: 20,
	minPoolSize: 0,
	maxConnecting: 2,
	maxIdleTimeMS: 60000,
	timeoutMS: 5000,
	waitQueueTimeoutMS: 1000
};

/** Abandon only reads. Accepted mutation workflows retain their write/audit path. */
export function readCancellationPlugin(schema: Schema) {
	for (const operation of ["find", "findOne", "countDocuments", "estimatedDocumentCount", "distinct"] as const) {
		schema.pre(operation, function () {
			const signal = readRequestSignal();
			signal?.throwIfAborted();
			if (signal) {
				const existing = this.getOptions().signal as AbortSignal | undefined;
				this.setOptions({
					signal: existing && existing !== signal ? AbortSignal.any([existing, signal]) : signal
				});
			}
		});
	}
}

export function singleFlightReadiness(check: () => Promise<boolean>) {
	let pending: Promise<boolean> | undefined;
	return () => {
		if (!pending) {
			pending = Promise.resolve()
				.then(check)
				.catch(() => false)
				.finally(() => {
					pending = undefined;
				});
		}
		return pending;
	};
}
