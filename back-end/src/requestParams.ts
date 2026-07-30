import type { Response } from "express";
import { Types } from "mongoose";

export function stringParam(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

export function objectIdParam(value: string | string[] | undefined, res: Response, label = "account"): string | null {
	const candidate = stringParam(value);
	if (typeof candidate !== "string" || !Types.ObjectId.isValid(candidate)) {
		res.status(400).json({
			error: "invalid_identifier",
			message: `The ${label} identifier is invalid.`
		});
		return null;
	}
	return candidate;
}
