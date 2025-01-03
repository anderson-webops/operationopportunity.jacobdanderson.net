import * as readlineSync from "readline-sync";
import mongoose from "mongoose";
import { Admin, IAdmin } from "./admins.js";

// Connect to MongoDB
mongoose
	.connect("mongodb://localhost:27017/operationopportunity")
	.then(() => console.log("Connected to MongoDB"))
	.catch((err) => console.error("Error connecting to MongoDB:", err));

// Gather info
const name: string = readlineSync.question("Name: ");
const username: string = readlineSync.question("Username or email: ");
const password: string = readlineSync.question("Password: ", {
	hideEchoBack: true,
});

if (!name || !username || !password) {
	console.log("You need to enter name, username (email), and password!");
	process.exit(1);
}

(async () => {
	try {
		const existingAdmin = await Admin.findOne({ email: username });
		if (existingAdmin) {
			console.log("That username already exists");
			process.exit(1);
		}

		const admin: IAdmin = new Admin({
			name: name,
			email: username,
			password: password,
			editAdmins: false,
			saveEdit: "Edit",
			role: "admin",
		});

		await admin.save();
		console.log("OK, admin user created for", name, "with username", username);
		process.exit(0);
	} catch (error) {
		console.error(`Error: ${error}`);
		console.error("Error in create-admin-user.ts AdminModel.findOne()");
		process.exit(1);
	}
})();
