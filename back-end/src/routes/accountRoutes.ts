// src/routes/accountRoutes.ts

import { Router } from "express";
import { changeEmail, checkEmail, login, logout } from "../controllers/auth/authController.ts";

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
