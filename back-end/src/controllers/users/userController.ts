// src/controllers/users/userController.ts
import { User } from "../../models/schemas/User.ts";
import { makeEntityController } from "../common/entityController.ts";

export const {
	create: createUser,
	getAll: getAllUsers,
	update: updateUser,
	remove: deleteUser,
	getLoggedIn: getLoggedInUser
} = makeEntityController({
	model: User,
	idParam: "userID",
	sessionKey: "userID",
	responseKey: "currentUser"
});
