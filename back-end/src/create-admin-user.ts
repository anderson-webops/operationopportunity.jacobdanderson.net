// Connect to MongoDB
import { exit } from "node:process";
import mongoose from "mongoose";
// src/create-admin-user.ts
import * as readlineSync from "readline-sync";

import { Admin } from "./models/schemas/Admin";

mongoose
	.connect("mongodb://localhost:27017/operationopportunity")
	.then(() => console.log("Connected to MongoDB"))
	.catch((err) => {
		console.error("Error connecting to MongoDB:", err);
		exit(1);
	});

// Gather input
const name: string = readlineSync.question("Name: ");
const email: string = readlineSync.question("Email: ");
const password: string = readlineSync.question("Password: ", {
	hideEchoBack: true
});

if (!name || !email || !password) {
	console.error("You need to enter name, email, and password!");
	exit(1);
}

(async () => {
	try {
		const existingAdmin = await Admin.findOne({ email });
		if (existingAdmin) {
			console.error("That email already exists");
			exit(1);
		}

		const admin = new Admin({
			name,
			email,
			password,
			editAdmins: false,
			saveEdit: "Edit",
			role: "admin"
		});

		await admin.save();
		// console.log(`Admin user created for ${name} with email ${email}`);
		exit(0);
	}
	catch (error) {
		console.error(`Error: ${error}`);
		exit(1);
	}
})();
