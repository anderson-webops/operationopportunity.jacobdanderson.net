// src/routes/tutorRoutes.ts

import express from "express";
import {
	createTutor,
	getAllTutors,
	updateTutor,
	deleteTutor
} from "../controllers/tutorController";
import { validAdmin } from "../middleware/auth";

const router = express.Router();

// Route to create a tutor
router.post("/", createTutor);

// Route to get all tutors
router.get("/", getAllTutors);

// Route to update a tutor's information (protected - only admins can update tutors)
router.put("/:tutorID", validAdmin, updateTutor);

// Route to delete a tutor (protected - only admins can delete tutors)
router.delete("/remove/:tutorID", validAdmin, deleteTutor);

// Export the router
export const tutorRoutes = router;
