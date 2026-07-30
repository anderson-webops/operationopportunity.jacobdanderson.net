import { Router } from "express";
import {
	assignTutorToUser,
	createUser,
	deleteUser,
	getAllUsers,
	getLoggedInUser,
	getUsersOfTutor,
	updateAssignedUser,
	updateOwnUser
} from "../controllers/users/userController.js";
import {
	optionalPrincipal,
	validActiveTutorOrAdmin,
	validAdmin,
	validPrincipal,
	validUser
} from "../middleware/auth.js";
import {
	authenticatedMutationRateLimit,
	credentialMutationRateLimit,
	signupRateLimit
} from "../middleware/rateLimit.js";

const router = Router();

router.post("/", signupRateLimit, optionalPrincipal, createUser);
router.get("/all", ...validAdmin, getAllUsers);
router.get("/oftutor/:tutorID", ...validActiveTutorOrAdmin, getUsersOfTutor);
router.get("/loggedin", ...validUser, getLoggedInUser);

router.put("/user/:userID", credentialMutationRateLimit, ...validUser, updateOwnUser);
router.put("/tutor/:userID/:tutorID", authenticatedMutationRateLimit, validPrincipal, assignTutorToUser);
router.put("/tutor/:userID", authenticatedMutationRateLimit, ...validActiveTutorOrAdmin, updateAssignedUser);
router.delete("/user/:userID", authenticatedMutationRateLimit, validPrincipal, deleteUser);
router.delete("/admin/:userID", authenticatedMutationRateLimit, ...validAdmin, deleteUser);

export const userRoutes = router;
