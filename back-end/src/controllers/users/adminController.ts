// src/controllers/users/adminController.ts
import { makeEntityController } from "../common/entityController";
import { Admin } from "../../models/schemas/Admin";

export const {
	create: createAdmin,
	getAll: getAllAdmins,
	update: updateAdmin,
	remove: deleteAdmin,
	getLoggedIn: getLoggedInAdmin
} = makeEntityController({
	model: Admin,
	idParam: "adminID",
	sessionKey: "adminID",
	responseKey: "currentAdmin,
});
