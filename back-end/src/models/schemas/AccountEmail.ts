import type { Model } from "mongoose";
import type { AccountRole } from "../../types/account.js";
import mongoose, { Schema } from "mongoose";

export interface IAccountEmail {
	_id: string;
	role: AccountRole;
	accountId: mongoose.Types.ObjectId;
}

const accountEmailSchema = new Schema<IAccountEmail>(
	{
		_id: { type: String, required: true, maxlength: 254 },
		role: { type: String, enum: ["admin", "tutor", "user"], required: true },
		accountId: { type: Schema.Types.ObjectId, required: true, index: true }
	},
	{ timestamps: true, strict: "throw" }
);

export const AccountEmail: Model<IAccountEmail> = mongoose.model<IAccountEmail>(
	"AccountEmail",
	accountEmailSchema
);
