// src/routes/adminRoutes.ts

import express from "express";
import { createAdmin, deleteAdmin, getAllAdmins, getLoggedInAdmin, updateAdmin } from "../controllers/adminController";
import { validAdmin } from "../middleware/auth";

const router = express.Router();

// Route to create an admin
router.post("/", createAdmin);

// Route to get all admins (protected)
router.get("/", validAdmin, getAllAdmins);

// Route to update an admin's information (protected)
router.put("/:adminID", validAdmin, updateAdmin);

// Route to delete an admin (protected)
router.delete("/remove/:adminID", validAdmin, deleteAdmin);

// Route to get the currently logged-in admin (protected)
router.get("/loggedin", validAdmin, getLoggedInAdmin);

// Export the router
export const adminRoutes = router;
