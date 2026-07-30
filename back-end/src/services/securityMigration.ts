import { Admin } from "../models/schemas/Admin.js";
import { Tutor } from "../models/schemas/Tutor.js";
import { User } from "../models/schemas/User.js";

export async function applyAdditiveSecurityMigrations(): Promise<void> {
	await Promise.all([
		Admin.updateMany({ authVersion: { $exists: false } }, { $set: { authVersion: 0 } }),
		Admin.updateMany({ role: { $ne: "admin" } }, { $set: { role: "admin" } }),
		Tutor.updateMany({ authVersion: { $exists: false } }, { $set: { authVersion: 0 } }),
		Tutor.updateMany({ role: { $ne: "tutor" } }, { $set: { role: "tutor" } }),
		User.updateMany({ authVersion: { $exists: false } }, { $set: { authVersion: 0 } }),
		User.updateMany({ role: { $ne: "user" } }, { $set: { role: "user" } }),
		Tutor.updateMany({ status: { $exists: false } }, { $set: { status: "active" } })
	]);
}
