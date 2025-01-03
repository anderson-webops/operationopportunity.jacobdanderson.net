// src/controllers/userController.ts
import { Request, Response } from "express";
import { User } from "../models/User";
import { IUser } from "../types/IUser";
import { ITutor } from "../types/ITutor";
import { Tutor } from "../models/Tutor";
import { UserRequest } from "../middleware/auth";

// Create a user
export const createUser = async (req: UserRequest, res: Response) => {
	const { name, age, state, email, password, editUsers, saveEdit } = req.body;

	if (!name || !age || !state || !email || !password) {
		return res.status(400).send({ message: "All fields required" });
	}

	try {
		const existingUser = await User.findOne({ email });
		const existingTutor = await Tutor.findOne({ email });
		// Add similar checks if Admin can also have user accounts

		if (existingUser || existingTutor) {
			return res.status(403).send({ message: "Email already exists" });
		}

		const user: IUser = new User({
			name,
			email,
			age,
			state,
			password,
			editUsers,
			saveEdit,
		});

		await user.save();
		req.session.userID = user._id.toString();
		return res.send({ currentUser: user });
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
};

// Get users belonging to a given tutor
export const getUsersOfTutor = async (req: Request, res: Response) => {
	const { tutorID } = req.params;

	try {
		const tutor: ITutor | null = await Tutor.findById(tutorID);
		if (!tutor) {
			return res.sendStatus(404);
		}

		const users = await User.find({ tutor: tutor._id });
		return res.send(users);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
};

// Get all users
export const getAllUsers = async (_req: Request, res: Response) => {
	try {
		const users = await User.find();
		return res.send(users);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
};

// Update user info by the user themselves
export const updateUserSelf = async (req: UserRequest, res: Response) => {
	const { userID } = req.params;

	try {
		const user: IUser | null = await User.findById(userID);
		if (!user) {
			return res.sendStatus(404);
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
		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
};

// Update user info by the tutor
export const updateUserByTutor = async (req: UserRequest, res: Response) => {
	const { userID } = req.params;

	try {
		const user: IUser | null = await User.findById(userID);
		if (!user) {
			return res.sendStatus(404);
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
		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
};

// Assign tutor to user
export const assignTutorToUser = async (req: UserRequest, res: Response) => {
	const { userID, tutorID } = req.params;

	try {
		const user: IUser | null = await User.findById(userID);
		if (!user) {
			return res.sendStatus(404);
		}

		const tutor: ITutor | null = await Tutor.findById(tutorID);
		if (!tutor) {
			return res.sendStatus(404);
		}

		user.tutor = tutor._id;
		await user.save();
		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
};

// Delete user by the user themselves
export const deleteUserSelf = async (req: Request, res: Response) => {
	const { userID } = req.params;

	try {
		const result = await User.deleteOne({ _id: userID });
		if (result.deletedCount === 0) {
			return res.sendStatus(404);
		}
		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
};

// Delete user by the tutor
export const deleteUserByTutor = async (req: Request, res: Response) => {
	const { userID } = req.params;

	try {
		const result = await User.deleteOne({ _id: userID });
		if (result.deletedCount === 0) {
			return res.sendStatus(404);
		}
		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
};

// Delete users under a tutor
export const deleteUsersUnderTutor = async (req: Request, res: Response) => {
	const { tutorID } = req.params;

	try {
		const tutor = await Tutor.findById(tutorID);
		if (!tutor) {
			return res.sendStatus(404);
		}

		const users = await User.find({ tutor: tutor._id });
		if (!users || users.length === 0) {
			return res.sendStatus(404);
		}

		const deletionPromises = users.map(user => User.deleteOne({ _id: user._id }));
		await Promise.all(deletionPromises);

		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
};

// Get logged-in user
export const getLoggedInUser = async (req: UserRequest, res: Response) => {
	try {
		if (req.currentUser) {
			res.send({ currentUser: req.currentUser });
		} else {
			res.sendStatus(404);
		}
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
};

// Logout
export const logoutUser = async (req: Request, res: Response) => {
	try {
		if (req.session) {
			req.session.destroy(err => {
				if (err) {
					console.error(err);
					return res.sendStatus(500);
				}
				return res.sendStatus(200);
			});
		} else {
			return res.sendStatus(200);
		}
	} catch (error) {
		console.error(error);
		return res.sendStatus(500);
	}
};
