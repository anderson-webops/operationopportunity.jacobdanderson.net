import type { Writable } from "node:stream";
import { Buffer } from "node:buffer";
import process from "node:process";

/** Stop request admission before a stalled journal can grow an unbounded queue. */
export class ServiceLog {
	private pending = 0;
	private failed = false;
	private draining: Promise<void> | undefined;
	private drained: (() => void) | undefined;

	constructor(
		private readonly stdout: Writable,
		private readonly stderr: Writable = stdout
	) {
		for (const stream of new Set([stdout, stderr])) {
			stream.on("error", () => {
				this.failed = true;
			});
			stream.once("close", () => {
				this.failed = true;
			});
		}
	}

	get ready(): boolean {
		return !this.failed && this.pending < 64 * 1024;
	}

	get pendingBytes(): number {
		return this.pending;
	}

	write(entry: Record<string, unknown>): boolean {
		const line = `${JSON.stringify(entry)}\n`;
		const bytes = Buffer.byteLength(line);
		// Headroom covers error and audit records from all 64 admitted requests.
		// Oversized records or an impossible producer overrun fail readiness closed.
		if (this.failed || bytes > 4096 || this.pending + bytes > 1024 * 1024) {
			this.failed = true;
			return false;
		}
		this.pending += bytes;
		let completed = false;
		const finish = (error?: Error | null) => {
			if (completed) return;
			completed = true;
			this.pending -= bytes;
			if (error) this.failed = true;
			if (this.pending === 0) {
				this.drained?.();
				this.drained = undefined;
				this.draining = undefined;
			}
		};
		try {
			(entry.level === "error" ? this.stderr : this.stdout).write(line, finish);
		} catch {
			finish(new Error("service log output unavailable"));
			return false;
		}
		return true;
	}

	drain(): Promise<void> {
		if (this.pending === 0) return Promise.resolve();
		return (this.draining ??= new Promise<void>((resolve) => {
			this.drained = resolve;
		}));
	}
}

export const serviceLog = new ServiceLog(process.stdout, process.stderr);
