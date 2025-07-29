// src/controllers/users/adminController.ts
import { Admin } from "../../models/schemas/Admin";
import { makeEntityController } from "../common/entityController";

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
	responseKey: "currentAdmin"
});
