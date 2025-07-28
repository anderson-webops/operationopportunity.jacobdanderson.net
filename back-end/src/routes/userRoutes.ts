// src/routes/userRoutes.ts
import express from "express";
import { validTutor, validUser } from "../middleware/auth";
import { createUser, deleteUser, getAllUsers, getLoggedInUser, updateUser } from "../controllers/users/userController";
import { assignTutorToUser, deleteUsersUnderTutor, getUsersOfTutor } from "../controllers/users/userExtraController";
import { logout as logoutUser } from "../controllers/auth/authController";

const router = express.Router();

// Create a user
router.post("/", createUser);

// Get users belonging to a given tutor
router.get("/oftutor/:tutorID", getUsersOfTutor);

// Get all users
router.get("/all", getAllUsers);

// Update user info by the user themselves
router.put("/user/:userID", validUser, updateUser);

// Update user info by the tutor
router.put("/tutor/:userID", validTutor, updateUser);

// Assign a tutor to a user
router.put("/tutor/:userID/:tutorID", assignTutorToUser);

// Delete the user by the user themselves
router.delete("/user/:userID", validUser, deleteUser);

// Delete the user by the tutor
router.delete("/tutor/:userID", validTutor, deleteUser);

// Delete users under a tutor
router.delete("/under/:tutorID", deleteUsersUnderTutor);

// Get logged in user
router.get("/loggedin", validUser, getLoggedInUser);

// Logout
router.delete("/logout", validUser, logoutUser);

export const userRoutes = router;
