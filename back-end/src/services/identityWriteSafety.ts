import mongoose from "mongoose";
import { HttpError, isDuplicateKeyError, isVersionConflictError } from "../errors.js";

/** Release an identity only when the account write is known not to have committed. */
export function accountWriteDefinitelyFailed(error: unknown): boolean {
	return (
		isDuplicateKeyError(error) ||
		isVersionConflictError(error) ||
		error instanceof mongoose.Error.ValidationError ||
		error instanceof mongoose.Error.CastError ||
		(error instanceof HttpError && ["authentication_busy", "email_conflict", "stale_update"].includes(error.code))
	);
}
