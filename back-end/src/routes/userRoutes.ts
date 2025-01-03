// src/routes/userRoutes.ts
import express from "express";
import {
	createUser,
	getUsersOfTutor,
	getAllUsers,
	updateUserSelf,
	updateUserByTutor,
	assignTutorToUser,
	deleteUserSelf,
	deleteUserByTutor,
	deleteUsersUnderTutor,
	getLoggedInUser,
	logoutUser
} from "../controllers/userController";
import { validUser, validTutor } from "../middleware/auth";

const router = express.Router();

// Create a user
router.post("/", createUser);

// Get users belonging to a given tutor
router.get("/oftutor/:tutorID", getUsersOfTutor);

// Get all users
router.get("/all", getAllUsers);

// Update user info by the user themselves
router.put("/user/:userID", validUser, updateUserSelf);

// Update user info by the tutor
router.put("/tutor/:userID", validTutor, updateUserByTutor);

// Assign a tutor to a user
router.put("/tutor/:userID/:tutorID", assignTutorToUser);

// Delete the user by the user themselves
router.delete("/user/:userID", validUser, deleteUserSelf);

// Delete the user by the tutor
router.delete("/tutor/:userID", validTutor, deleteUserByTutor);

// Delete users under a tutor
router.delete("/under/:tutorID", deleteUsersUnderTutor);

// Get logged in user
router.get("/loggedin", validUser, getLoggedInUser);

// Logout
router.delete("/logout", validUser, logoutUser);

export const userRoutes = router;
