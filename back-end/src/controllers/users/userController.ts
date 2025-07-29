// src/controllers/users/userController.ts
import { makeEntityController } from "../common/entityController";
import { User } from "../../models/schemas/User";

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
	responseKey: "currentUser,
});
