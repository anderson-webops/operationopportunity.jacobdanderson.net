// src/server.ts
import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cookieSession from "cookie-session";

import { tutorRoutes } from "./routes/tutorRoutes";
import { userRoutes } from "./routes/userRoutes";
import { adminRoutes } from "./routes/adminRoutes";
import { accountRoutes } from "./routes/accountRoutes";

const app = express();

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
	throw new Error("Missing SESSION_SECRET in environment");
}

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(
	cookieSession({
		name: "session",
		keys: [SESSION_SECRET],
		maxAge: 24 * 60 * 60 * 1000, // 24 hours
		sameSite: "lax", // or 'none' if you’re on https
		secure: process.env.NODE_ENV === "production",
	}),
);

// Connect to MongoDB
mongoose
	.connect("mongodb://localhost:27017/operationopportunity")
	.then(() => console.log("Connected to MongoDB"))
	.catch((err) => console.error("Could not connect to MongoDB", err));

// Routes
app.use("/api/tutors", tutorRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/accounts", accountRoutes);

// Start Server
const PORT: number | string = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}!`));
