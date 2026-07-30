import { Router } from "express";
import { getCsrfToken, getCurrentSession, login, logout } from "../controllers/auth/authController.js";
import { optionalPrincipal, validPrincipal } from "../middleware/auth.js";
import {
	authenticatedMutationRateLimit,
	loginAccountRateLimit,
	loginRateLimit,
	publicReadRateLimit
} from "../middleware/rateLimit.js";

const router = Router();

router.get("/csrf", publicReadRateLimit, getCsrfToken);
router.get("/me", publicReadRateLimit, optionalPrincipal, getCurrentSession);
router.post("/login", loginRateLimit, loginAccountRateLimit, login);
router.delete("/logout", authenticatedMutationRateLimit, validPrincipal, logout);

export const accountRoutes = router;
