// src/controllers/users/userController.ts
import { User } from "../../models/schemas/User";
import { makeEntityController } from "../common/entityController";

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
