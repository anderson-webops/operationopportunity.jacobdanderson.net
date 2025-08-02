import { env, exit } from "node:process";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cookieSession from "cookie-session";
import express from "express";
import mongoose from "mongoose";

import { accountRoutes } from "./routes/accountRoutes.ts";
import { adminRoutes } from "./routes/adminRoutes.ts";
import { tutorRoutes } from "./routes/tutorRoutes.ts";
import { userRoutes } from "./routes/userRoutes.ts";

// src/server.ts
import "dotenv/config";

const app = express();

const SESSION_SECRET = env.SESSION_SECRET;
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
		secure: env.NODE_ENV === "production"
	})
);

const MONGODB_URI = env.MONGODB_URI;
if (!MONGODB_URI) {
	console.error("MONGODB_URI is required");
	exit(1);
}

// Connect to MongoDB
mongoose
	.connect(MONGODB_URI)
	.then(() => console.log("Connected to MongoDB"))
	.catch((err) => {
		console.error("Error connecting to MongoDB:", err);
		exit(1);
	});

// Routes
app.use("/api/tutors", tutorRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/accounts", accountRoutes);

// Start Server
const PORT: number | string = env.PORT || 3002;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}!`));
