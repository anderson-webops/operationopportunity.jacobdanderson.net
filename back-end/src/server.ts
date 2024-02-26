import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cookieSession from "cookie-session";

import { tutorRoutes } from "./tutors.js";
import { userRoutes } from "./users.js";
import { adminRoutes } from "./admins.js";
import { accountRoutes } from "./accounts.js";

const app: express.Application = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

// connect to the database
mongoose.connect("mongodb://localhost:27017/operationopportunity").then(() => console.log("Connected to MongoDB"))
	.catch(err => console.error("Could not connect to MongoDB", err));

app.use(cookieParser());

app.use(cookieSession({
	name: "session",
	keys: ["secretValue"],
	maxAge: 24 * 60 * 60 * 1000
}));


// Setup routes
app.use("/api/tutors", tutorRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/accounts", accountRoutes);

const PORT: number | string = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}!`));
