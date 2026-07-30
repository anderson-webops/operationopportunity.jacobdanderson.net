import type { Document, Schema } from "mongoose";

export function immutableRolePlugin<T extends Document & { role: string }>(schema: Schema<T>) {
	schema.pre("validate", function (this: T) {
		if (!this.isNew && this.isModified("role")) {
			throw new Error("Account roles are immutable.");
		}
	});
}
