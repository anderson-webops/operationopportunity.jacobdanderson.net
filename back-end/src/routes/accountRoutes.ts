// src/routes/accountRoutes.ts

import { Router } from "express";
import { login, logout, checkEmail, changeEmail } from "../controllers/auth/authController";

const router = Router();

// Route to check if email is available (useful for account creation)
router.post("/checkEmail", checkEmail);

// Route to change email (could be used by users, tutors, or admins)
router.post("/changeEmail/:ID", changeEmail);

// Route to handle login
router.post("/login", login);

router.delete("/logout", logout);

// Export the router
export const accountRoutes = router;
