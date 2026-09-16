import { HttpError } from "../errors.js";

export const AUTHORIZATION_WAIT_MS = 5000;
export const AUTHORIZATION_MAX_WAITING = 32;

export function workflowBusy(): HttpError {
	return new HttpError(
		503,
		"authorization_workflow_busy",
		"An authorization change is temporarily busy. Please retry."
	);
}

/** The process owns this slot until the complete workflow and lock release settle. */
export class WorkflowCapacity {
	private active = false;
	private readonly waiting: Array<() => void> = [];

	constructor(
		private readonly maxWaiting = AUTHORIZATION_MAX_WAITING,
		private readonly waitMs = AUTHORIZATION_WAIT_MS
	) {}

	get pending(): number {
		return this.waiting.length;
	}

	async run<T>(operation: (deadline: number) => Promise<T>, signal?: AbortSignal): Promise<T> {
		signal?.throwIfAborted();
		const deadline = performance.now() + this.waitMs;
		if (this.active) {
			if (this.waiting.length >= this.maxWaiting) throw workflowBusy();
			await new Promise<void>((resolve, reject) => {
				let timer: ReturnType<typeof setTimeout>;
				let cancel: () => void;
				let admit: () => void;
				const cleanup = () => {
					clearTimeout(timer);
					signal?.removeEventListener("abort", cancel);
				};
				const remove = (error: unknown) => {
					const index = this.waiting.indexOf(admit);
					if (index === -1) return;
					this.waiting.splice(index, 1);
					cleanup();
					reject(error);
				};
				cancel = () => remove(signal!.reason);
				admit = () => {
					cleanup();
					resolve();
				};
				timer = setTimeout(() => remove(workflowBusy()), Math.max(1, deadline - performance.now()));
				this.waiting.push(admit);
				signal?.addEventListener("abort", cancel, { once: true });
			});
		} else {
			this.active = true;
		}
		try {
			signal?.throwIfAborted();
			if (performance.now() >= deadline) throw workflowBusy();
			return await operation(deadline);
		} finally {
			const next = this.waiting.shift();
			if (next) next();
			else this.active = false;
		}
	}
}
