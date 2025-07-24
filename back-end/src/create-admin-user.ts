// src/create-admin-user.ts
import * as readlineSync from "readline-sync";
import mongoose from "mongoose";
import { Admin } from "./models/Admin";

// Connect to MongoDB
mongoose
	.connect("mongodb://localhost:27017/operationopportunity")
	.then(() => console.log("Connected to MongoDB"))
	.catch(err => {
		console.error("Error connecting to MongoDB:", err);
		process.exit(1);
	});

// Gather input
const name: string = readlineSync.question("Name: ");
const email: string = readlineSync.question("Email: ");
const password: string = readlineSync.question("Password: ", {
	hideEchoBack: true
});

if (!name || !email || !password) {
	console.log("You need to enter name, email, and password!");
	process.exit(1);
}

(async () => {
	try {
		const existingAdmin = await Admin.findOne({ email });
		if (existingAdmin) {
			console.log("That email already exists");
			process.exit(1);
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
		console.log(`Admin user created for ${name} with email ${email}`);
		process.exit(0);
	} catch (error) {
		console.error(`Error: ${error}`);
		process.exit(1);
	}
})();
