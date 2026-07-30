import { Router } from "express";
import {
	createTutor,
	deleteTutor,
	getAllTutors,
	getLoggedInTutor,
	getTutorDirectory,
	updateTutor,
	updateTutorStatus
} from "../controllers/users/tutorController.js";
import { optionalPrincipal, validAdmin, validAdminManager, validTutor, validTutorOrAdmin } from "../middleware/auth.js";
import {
	authenticatedMutationRateLimit,
	credentialMutationRateLimit,
	publicReadRateLimit,
	signupRateLimit
} from "../middleware/rateLimit.js";

const router = Router();

router.post("/", signupRateLimit, optionalPrincipal, createTutor);
router.get("/", publicReadRateLimit, getTutorDirectory);
router.get("/all", ...validAdmin, getAllTutors);
router.get("/loggedin", ...validTutor, getLoggedInTutor);
router.patch("/:tutorID/status", authenticatedMutationRateLimit, ...validAdminManager, updateTutorStatus);
router.put("/:tutorID", credentialMutationRateLimit, ...validTutor, updateTutor);
router.delete("/remove/:tutorID", authenticatedMutationRateLimit, ...validTutorOrAdmin, deleteTutor);

export const tutorRoutes = router;
