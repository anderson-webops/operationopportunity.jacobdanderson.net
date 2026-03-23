// src/controllers/users/userExtraController.ts
import type { RequestHandler } from "express";
import { Types } from "mongoose";
import { User } from "../../models/schemas/User.js";

function getTutorIDParam(req: { params: { tutorID?: string | string[] } }, res: any): string | null {
	const paramTutorID = req.params.tutorID;
	const tutorID = Array.isArray(paramTutorID) ? paramTutorID[0] : paramTutorID;
	if (typeof tutorID !== "string") {
		res.status(400).json({ message: "Invalid tutor ID" });
		return null;
	}
	if (!Types.ObjectId.isValid(tutorID)) {
		res.status(400).json({ message: "Invalid tutor ID" });
		return null;
	}
	return tutorID;
}

function getUserIDParam(req: { params: { userID?: string | string[] } }, res: any): string | null {
	const paramUserID = req.params.userID;
	const userID = Array.isArray(paramUserID) ? paramUserID[0] : paramUserID;
	if (typeof userID !== "string") {
		res.status(400).json({ message: "Invalid user ID" });
		return null;
	}
	if (!Types.ObjectId.isValid(userID)) {
		res.status(400).json({ message: "Invalid user ID" });
		return null;
	}
	return userID;
}

export const getUsersOfTutor: RequestHandler = async (req, res) => {
	const tutorID = getTutorIDParam(req, res);
	if (!tutorID) return;

	const users = await User.find({ tutor: new Types.ObjectId(tutorID) });
	res.json(users);
};

export const assignTutorToUser: RequestHandler = async (req, res) => {
	const userID = getUserIDParam(req, res);
	const tutorID = getTutorIDParam(req, res);
	if (!userID || !tutorID) return;

	const user = await User.findById(userID);
	if (!user) return res.sendStatus(404);
	user.tutor = new Types.ObjectId(tutorID);
	await user.save();
	res.sendStatus(200);
};

export const deleteUsersUnderTutor: RequestHandler = async (req, res) => {
	const tutorID = getTutorIDParam(req, res);
	if (!tutorID) return;

	await User.deleteMany({ tutor: new Types.ObjectId(tutorID) });
	res.sendStatus(200);
};
