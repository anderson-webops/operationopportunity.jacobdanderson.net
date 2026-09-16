import type { RequestHandler, Response } from "express";
import { AsyncLocalStorage } from "node:async_hooks";

const requestScope = new AsyncLocalStorage<{ signal: AbortSignal; readOnly: boolean }>();
export function readRequestSignal(): AbortSignal | undefined {
	const scope = requestScope.getStore();
	return scope?.readOnly ? scope.signal : undefined;
}

export const MAX_ACTIVE_REQUESTS = 64;
export const MAX_CONNECTIONS_PER_LISTENER = 256;

interface RequestWork {
	run: <T>(operation: (signal: AbortSignal) => Promise<T>) => Promise<T>;
}

/** A disconnected response still owns its slot until its accepted work settles. */
export class RequestCapacity {
	private active = 0;
	private stopping = false;
	private idle: Promise<void> | undefined;
	private resolveIdle: (() => void) | undefined;

	constructor(
		private readonly limit = MAX_ACTIVE_REQUESTS,
		private readonly healthy = () => true
	) {}

	get activeRequests(): number {
		return this.active;
	}

	get ready(): boolean {
		return !this.stopping && this.active < this.limit && this.healthy();
	}

	readonly middleware: RequestHandler = (req, res, next) => {
		if (!this.ready) {
			res.setHeader("Cache-Control", "no-store");
			res.setHeader("Retry-After", "1");
			res.status(503).json({
				error: "service_busy",
				message: "Service is temporarily unavailable. Please retry."
			});
			return;
		}
		this.active++;
		const controller = new AbortController();
		let pending = 0;
		let ended = false;
		let released = false;
		const release = () => {
			if (!ended || pending !== 0 || released) return;
			released = true;
			this.active--;
			delete res.locals.requestWork;
			if (this.active === 0) {
				this.resolveIdle?.();
				this.resolveIdle = undefined;
				this.idle = undefined;
			}
		};
		const end = () => {
			ended = true;
			res.off("finish", end);
			res.off("close", end);
			controller.abort(new Error("Request connection closed"));
			release();
		};
		res.once("finish", end);
		res.once("close", end);
		res.locals.requestWork = {
			async run<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
				controller.signal.throwIfAborted();
				pending++;
				try {
					return await operation(controller.signal);
				} finally {
					pending--;
					release();
				}
			}
		} satisfies RequestWork;
		requestScope.run({ signal: controller.signal, readOnly: req.method === "GET" || req.method === "HEAD" }, next);
	};

	stop(): void {
		this.stopping = true;
	}

	drain(): Promise<void> {
		if (this.active === 0) return Promise.resolve();
		return (this.idle ??= new Promise<void>((resolve) => {
			this.resolveIdle = resolve;
		}));
	}
}

export function runRequestWork<T>(res: Response, operation: (signal?: AbortSignal) => Promise<T>): Promise<T> {
	const work = res.locals.requestWork as RequestWork | undefined;
	return work ? work.run(operation) : operation();
}

/** Hold request admission through actual async handlers, even after disconnect. */
export function trackHandler(handler: RequestHandler): RequestHandler {
	return (req, res, next) => {
		if (res.destroyed) return;
		return runRequestWork(res, async () => {
			return handler(req, res, (error) => {
				if (!res.destroyed) next(error);
			});
		});
	};
}

/** Session lookup callbacks also own their admission slot until they settle. */
export function trackSession(handler: RequestHandler): RequestHandler {
	return (req, res, next) =>
		runRequestWork(
			res,
			async () =>
				new Promise<void>((resolve, reject) => {
					try {
						handler(req, res, (error) => {
							try {
								if (!res.destroyed) next(error);
								resolve();
							} catch (failure) {
								reject(failure);
							}
						});
					} catch (error) {
						reject(error);
					}
				})
		);
}
