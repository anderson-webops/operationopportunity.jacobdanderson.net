// src/controllers/userController.ts
import { RequestHandler } from "express";
import { User } from "../models/User";
import { IUser } from "../types/IUser";
import { ITutor } from "../types/ITutor";
import { Tutor } from "../models/Tutor";
import { Types } from "mongoose";

// Create a user
export const createUser: RequestHandler = async (req, res) => {
	const { name, age, state, email, password, editUsers, saveEdit } = req.body;

	if (!name || !age || !state || !email || !password) {
		res.status(400).json({ message: "All fields required" });
		return;
	}

	try {
		const existingUser = await User.findOne({ email });
		const existingTutor = await Tutor.findOne({ email });
		// Add similar checks if Admin can also have user accounts

		if (existingUser || existingTutor) {
			res.status(403).json({ message: "Email already exists" });
			return;
		}

		const user: IUser = new User({
			name,
			email,
			age,
			state,
			password,
			editUsers,
			saveEdit
		});

		await user.save();
		req.session.userID = user._id.toString();
		res.json({ currentUser: user });
		return;
	} catch (error) {
		console.error(error);
		res.sendStatus(500);
		return;
	}
};

// Get users belonging to a given tutor
export const getUsersOfTutor: RequestHandler = async (req, res) => {
	const { tutorID } = req.params;

	try {
		const tutor: ITutor | null = await Tutor.findById(tutorID);
		if (!tutor) {
			res.sendStatus(404);
			return;
		}

		const users = await User.find({ tutor: tutor._id });
		res.json(users);
		return;
	} catch (error) {
		console.error(error);
		res.sendStatus(500);
		return;
	}
};

// Get all users
export const getAllUsers: RequestHandler = async (_req, res) => {
	try {
		const users = await User.find();
		res.json(users);
		return;
	} catch (error) {
		console.error(error);
		res.sendStatus(500);
		return;
	}
};

// Update user info by the user themselves
export const updateUserSelf: RequestHandler = async (req, res) => {
	const { userID } = req.params;

	try {
		const user: IUser | null = await User.findById(userID);
		if (!user) {
			res.sendStatus(404);
			return;
		}

		const { name, email, age, state, editUsers, saveEdit, password } = req.body;

		if (name) user.name = name;
		if (email) user.email = email;
		if (age) user.age = age;
		if (state) user.state = state;
		if (typeof editUsers !== "undefined") user.editUsers = editUsers;
		if (typeof saveEdit !== "undefined") user.saveEdit = saveEdit;
		if (password) user.password = password; // This will trigger the pre-save hook for hashing

		await user.save();
		res.sendStatus(200);
		return;
	} catch (error) {
		console.error(error);
		res.sendStatus(500);
		return;
	}
};

// Update user info by the tutor
export const updateUserByTutor: RequestHandler = async (req, res) => {
	const { userID } = req.params;

	try {
		const user: IUser | null = await User.findById(userID);
		if (!user) {
			res.sendStatus(404);
			return;
		}

		const { name, email, age, state, editUsers, saveEdit, password } = req.body;

		if (name) user.name = name;
		if (email) user.email = email;
		if (age) user.age = age;
		if (state) user.state = state;
		if (typeof editUsers !== "undefined") user.editUsers = editUsers;
		if (typeof saveEdit !== "undefined") user.saveEdit = saveEdit;
		if (password) user.password = password; // This will trigger the pre-save hook for hashing

		await user.save();
		res.sendStatus(200);
		return;
	} catch (error) {
		console.error(error);
		res.sendStatus(500);
		return;
	}
};

// Assign tutor to user
export const assignTutorToUser: RequestHandler = async (req, res) => {
	const { userID, tutorID } = req.params;

	try {
		const user: IUser | null = await User.findById(userID);
		if (!user) {
			res.sendStatus(404);
			return;
		}

		const tutor: ITutor | null = await Tutor.findById(tutorID);
		if (!tutor) {
			res.sendStatus(404);
			return;
		}

		user.tutor = tutor._id as Types.ObjectId;
		await user.save();
		res.sendStatus(200);
		return;
	} catch (error) {
		console.error(error);
		res.sendStatus(500);
		return;
	}
};

// Delete user by the user themselves
export const deleteUserSelf: RequestHandler = async (req, res) => {
	const { userID } = req.params;

	try {
		const result = await User.deleteOne({ _id: userID });
		if (result.deletedCount === 0) {
			res.sendStatus(404);
			return;
		}
		res.sendStatus(200);
		return;
	} catch (error) {
		console.error(error);
		res.sendStatus(500);
		return;
	}
};

// Delete user by the tutor
export const deleteUserByTutor: RequestHandler = async (req, res) => {
	const { userID } = req.params;

	try {
		const result = await User.deleteOne({ _id: userID });
		if (result.deletedCount === 0) {
			res.sendStatus(404);
			return;
		}
		res.sendStatus(200);
		return;
	} catch (error) {
		console.error(error);
		res.sendStatus(500);
		return;
	}
};

// Delete users under a tutor
export const deleteUsersUnderTutor: RequestHandler = async (req, res) => {
	const { tutorID } = req.params;

	try {
		const tutor = await Tutor.findById(tutorID);
		if (!tutor) {
			res.sendStatus(404);
			return;
		}

		const users = await User.find({ tutor: tutor._id });
		if (!users || users.length === 0) {
			res.sendStatus(404);
			return;
		}

		const deletionPromises = users.map(user => User.deleteOne({ _id: user._id }));
		await Promise.all(deletionPromises);

		res.sendStatus(200);
		return;
	} catch (error) {
		console.error(error);
		res.sendStatus(500);
		return;
	}
};

// Get logged-in user
export const getLoggedInUser: RequestHandler = async (req, res) => {
	try {
		if (req.currentUser) {
			res.json({ currentUser: req.currentUser });
		} else {
			res.sendStatus(404);
		}
	} catch (error) {
		console.error(error);
		res.sendStatus(500);
		return;
	}
};

// Logout
export const logoutUser: RequestHandler = async (req, res) => {
	try {
		if (req.session) {
			req.session.destroy(err => {
				if (err) {
					console.error(err);
					res.sendStatus(500);
					return;
				}
				res.sendStatus(200);
				return;
			});
		} else {
			res.sendStatus(200);
			return;
		}
	} catch (error) {
		console.error(error);
		res.sendStatus(500);
		return;
	}
};
