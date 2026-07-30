import type { Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

interface IAdminWorkflowLock {
	_id: "admin-membership";
	owner: string;
	expiresAt: Date;
}

const adminWorkflowLockSchema = new Schema<IAdminWorkflowLock>(
	{
		_id: { type: String, required: true },
		owner: { type: String, required: true },
		expiresAt: { type: Date, required: true }
	},
	{ versionKey: false, strict: "throw" }
);

export const AdminWorkflowLock: Model<IAdminWorkflowLock> = mongoose.model<IAdminWorkflowLock>(
	"AdminWorkflowLock",
	adminWorkflowLockSchema
);
