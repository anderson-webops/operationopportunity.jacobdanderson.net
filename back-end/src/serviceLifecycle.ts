import type { Express } from "express";
import type { Server } from "node:http";
import type { RequestCapacity } from "./runtimeCapacity.js";
import type { ServiceLog } from "./serviceLog.js";
import { createServer } from "node:http";

export function createService(options: {
	host: string;
	port: number;
	capacity: RequestCapacity;
	log: ServiceLog;
	initialize: () => Promise<Express>;
	dispose: () => Promise<void>;
	shutdownMs?: number;
}) {
	let server: Server | undefined;
	let starting: Promise<void> | undefined;
	let stopping: Promise<number> | undefined;
	function start(): Promise<void> {
		if (stopping) return Promise.reject(new Error("Service is already stopping"));
		return (starting ??= (async () => {
			const app = await options.initialize();
			if (stopping) return;
			server = createServer(app);
			server.maxConnections = 256;
			server.maxRequestsPerSocket = 100;
			server.maxHeadersCount = 100;
			server.requestTimeout = 15000;
			server.headersTimeout = 10000;
			server.keepAliveTimeout = 5000;
			await new Promise<void>((resolve, reject) => {
				server!.once("error", reject);
				server!.listen(options.port, options.host, () => {
					server!.off("error", reject);
					resolve();
				});
			});
			options.log.write({ level: "info", message: "Operation Opportunity API listening" });
		})());
	}
	function shutdown(reason: string): Promise<number> {
		if (stopping) return stopping;
		options.capacity.stop();
		options.log.write({ level: "info", message: "Graceful shutdown started", reason });
		stopping = (async () => {
			let timer: ReturnType<typeof setTimeout> | undefined;
			const cleanup = async () => {
				try {
					await starting;
				} catch {
					/* Partial startup still requires disposal. */
				}
				let failed = false;
				try {
					if (server?.listening) {
						await new Promise<void>((resolve, reject) =>
							server!.close((error) => (error ? reject(error) : resolve()))
						);
					}
					await options.capacity.drain();
				} catch {
					failed = true;
				}
				try {
					await options.dispose();
				} catch {
					failed = true;
				}
				options.log.write({
					level: failed ? "error" : "info",
					message: "Graceful shutdown completed",
					success: !failed
				});
				await options.log.drain();
				return failed ? 1 : 0;
			};
			try {
				return await Promise.race([
					cleanup(),
					new Promise<number>((resolve) => {
						timer = setTimeout(() => {
							server?.closeAllConnections();
							resolve(1);
						}, options.shutdownMs ?? 15000);
					})
				]);
			} finally {
				clearTimeout(timer);
			}
		})();
		return stopping;
	}
	return { start, shutdown, address: () => server?.address() };
}
