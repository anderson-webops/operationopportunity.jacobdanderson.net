// src/controllers/users/userExtraController.ts
import type { RequestHandler } from "express";
import { Types } from "mongoose";
import { User } from "../../models/schemas/User.ts";

export const getUsersOfTutor: RequestHandler = async (req, res) => {
	const users = await User.find({ tutor: new Types.ObjectId(req.params.tutorID) });
	res.json(users);
};

export const assignTutorToUser: RequestHandler = async (req, res) => {
	const { userID, tutorID } = req.params;
	const user = await User.findById(userID);
	if (!user) return res.sendStatus(404);
	user.tutor = new Types.ObjectId(tutorID);
	await user.save();
	res.sendStatus(200);
};

export const deleteUsersUnderTutor: RequestHandler = async (req, res) => {
	await User.deleteMany({ tutor: new Types.ObjectId(req.params.tutorID) });
	res.sendStatus(200);
};
