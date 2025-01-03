import * as readlineSync from "readline-sync";
import mongoose from "mongoose";

import {Admin, IAdmin} from "./admins.js";

// connect to Mongo
mongoose.connect("mongodb://localhost:27017/operationopportunity").then(() => console.log("Connected to MongoDB"));

// get the needed info
const name: string = readlineSync.question("Name: ");
const username: string = readlineSync.question("Username or email: ");
const password: string = readlineSync.question("Password: ", {
	hideEchoBack: true,
});

if (name === "" || username === "" || password === "") {
	console.log(
		"You need to enter a first name, last name, username, and password"
	);
	process.exit();
}

Admin.findOne({ email: username })
	.then((admin : mongoose.Document<never, NonNullable<unknown>, IAdmin> | null) : void => {
		if (admin) {
			console.log("That username already exists");
			process.exit();
		}
	})
	.then(() => {
		const admin : mongoose.Document<never, NonNullable<unknown>, IAdmin> = new Admin({
			name: name,
			email: username,
			password: password,
			editUsers: false,
			saveEdit: "Edit",
			role: "admin",
		});
		admin.save().then(() : void => {
			console.log(
				"OK, admin user created for",
				name,
				"with username",
				username
			);
			process.exit();
		});
	}).catch((error) : void => {
		console.log(`Error: ${error}`);
		console.log("Error in create-admin-user.ts AdminModel.findOne()");
	});
