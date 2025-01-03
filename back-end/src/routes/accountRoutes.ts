// src/routes/accountRoutes.ts

import express from "express";
import { checkEmail, changeEmail, login } from "../controllers/accountController";

const router = express.Router();

// Route to check if email is available (useful for account creation)
router.post("/", checkEmail);

// Route to change email (could be used by users, tutors, or admins)
router.post("/changeEmail/:ID", changeEmail);

// Route to handle login
router.post("/login", login);

// Export the router
export const accountRoutes = router;
