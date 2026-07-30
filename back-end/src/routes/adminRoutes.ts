import { Router } from "express";
import {
	createAdmin,
	deleteAdmin,
	getAllAdmins,
	getLoggedInAdmin,
	updateAdmin
} from "../controllers/users/adminController.js";
import { validAdmin, validAdminManager } from "../middleware/auth.js";
import {
	authenticatedMutationRateLimit,
	credentialMutationRateLimit
} from "../middleware/rateLimit.js";

const router = Router();

router.post("/", authenticatedMutationRateLimit, ...validAdminManager, createAdmin);
router.get("/", ...validAdmin, getAllAdmins);
router.get("/loggedin", ...validAdmin, getLoggedInAdmin);
router.put("/:adminID", credentialMutationRateLimit, ...validAdmin, updateAdmin);
router.delete("/remove/:adminID", authenticatedMutationRateLimit, ...validAdmin, deleteAdmin);

export const adminRoutes = router;
