// src/server.ts
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

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(
	cookieSession({
		name: "session",
		keys: ["yourSecretKey"], // Replace with environment variable in production
		maxAge: 24 * 60 * 60 * 1000, // 24 hours
	})
);

// Connect to MongoDB
mongoose
	.connect("mongodb://localhost:27017/operationopportunity")
	.then(() => console.log("Connected to MongoDB"))
	.catch(err => console.error("Could not connect to MongoDB", err));

// Routes
app.use("/api/tutors", tutorRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/accounts", accountRoutes);

// Start Server
const PORT: number | string = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}!`));
