// src/controllers/auth/authController.ts
import type { RequestHandler } from "express";
import type { IAdmin } from "../../types/entities/IAdmin.ts";
import type { ITutor } from "../../types/entities/ITutor.ts";
import type { IUser } from "../../types/entities/IUser.ts";

import type { CustomSession } from "../../types/session/CustomSession.ts";
import { Admin } from "../../models/schemas/Admin.ts";
import { Tutor } from "../../models/schemas/Tutor.ts";
import { User } from "../../models/schemas/User.ts";

// union of the three document types
type Entity = IUser | ITutor | IAdmin;

// type‐guard: filters out `null` and tells TS that `u` is an Entity
function isEntity(u: any): u is Entity {
	return u != null && typeof u.comparePassword === "function";
}

// LOGIN
export const login: RequestHandler = async (req, res) => {
	const { email, password } = req.body as { email?: string; password?: string };
	if (!email || !password) return res.sendStatus(400);

	// fetch all three, we’ll pick whichever isn’t null
	const results = (await Promise.all([
		User.findOne({ email }).exec(),
		Tutor.findOne({ email }).exec(),
		Admin.findOne({ email }).exec()
	])) as Array<IUser | ITutor | IAdmin | null>;

	// pick the first non‐null
	const entity = results.find(isEntity);
	if (!entity || !(await entity.comparePassword(password))) {
		return res.status(403).json({ message: "Bad credentials" });
	}

	// figure out whether it’s an admin/tutor/user
	const session = req.session as CustomSession;
	let sessionKey: keyof CustomSession;
	let responseKey: "currentAdmin" | "currentTutor" | "currentUser";

	if (entity instanceof Admin) {
		sessionKey = "adminID";
		responseKey = "currentAdmin";
	}
	else if (entity instanceof Tutor) {
		sessionKey = "tutorID";
		responseKey = "currentTutor";
	}
	else {
		sessionKey = "userID";
		responseKey = "currentUser";
	}

	// sign‐in
	session[sessionKey] = entity._id.toString();
	return res.json({ [responseKey]: entity });
};

/** LOGOUT */
export const logout: RequestHandler = (req, res) => {
	// clear cookie-session
	// assuming your cookie-session name is “session”
	(req.session as any) = null;
	return res.sendStatus(200);
};

// CHECK EMAIL
export const checkEmail: RequestHandler = async (req, res) => {
	const { id, email } = req.body as { id?: string; email?: string };
	if (!email) return res.status(400).json({ message: "Email required" });
	const [u, t, a] = await Promise.all([User.findOne({ email }), Tutor.findOne({ email }), Admin.findOne({ email })]);
	const conflict = [u, t, a].some(x => x && x.id !== id);
	res.status(conflict ? 403 : 200).json({
		message: conflict ? "Already in use" : "Available"
	});
};

/** CHANGE EMAIL */
export const changeEmail: RequestHandler = async (req, res) => {
	// to satisfy TS union‐of‐models overloads, first coerce your array to a single Model<any> type:
	const models = [User, Tutor, Admin] as Array<import("mongoose").Model<any>>;
	const { ID } = req.params;
	const { email: newEmail } = req.body;

	if (!newEmail) return res.status(400).json({ message: "New email is required." });

	for (const Model of models) {
		const doc = await Model.findById(ID);
		if (!doc) continue;
		if (await Model.exists({ email: newEmail })) {
			return res.status(403).json({ message: "Email already exists." });
		}
		doc.email = newEmail;
		await doc.save();
		return res.json({ message: "Email updated successfully." });
	}

	return res.status(404).json({ message: "Entity not found." });
};
