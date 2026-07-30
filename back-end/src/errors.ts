export class HttpError extends Error {
	readonly status: number;
	readonly code: string;

	constructor(status: number, code: string, message: string) {
		super(message);
		this.name = "HttpError";
		this.status = status;
		this.code = code;
	}
}

export function isDuplicateKeyError(error: unknown): boolean {
	return typeof error === "object"
		&& error !== null
		&& "code" in error
		&& (error as { code?: unknown }).code === 11000;
}

export function safeErrorSummary(error: unknown): { name: string; code?: string | number } {
	if (!(error instanceof Error)) return { name: "UnknownError" };
	const code = "code" in error
		&& (typeof (error as { code?: unknown }).code === "string"
			|| typeof (error as { code?: unknown }).code === "number")
		? (error as { code: string | number }).code
		: undefined;
	return {
		name: error.name || "Error",
		...(code === undefined ? {} : { code })
	};
}
