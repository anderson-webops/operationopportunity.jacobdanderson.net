// src/routes/tutorRoutes.ts

import express from "express";
import {
	createTutor,
	getAllTutors,
	updateTutor,
	deleteTutor
} from "../controllers/tutorController";
import { validTutorOrAdmin } from "../middleware/auth";

const router = express.Router();

// Route to create a tutor
router.post("/", createTutor);

// Route to get all tutors
router.get("/", getAllTutors);

// Route to update a tutor's information (protected - admin OR that tutor)
router.put("/:tutorID", validTutorOrAdmin, updateTutor);

// Route to delete a tutor (protected - admin OR that tutor)
router.delete("/remove/:tutorID", validTutorOrAdmin, deleteTutor);

// Export the router
export const tutorRoutes = router;
