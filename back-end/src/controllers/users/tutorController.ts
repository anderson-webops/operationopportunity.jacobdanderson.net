import { Tutor } from "../../models/schemas/Tutor";
// src/controllers/users/tutorController.ts
import { makeEntityController } from "../common/entityController";

export const {
	create: createTutor,
	getAll: getAllTutors,
	update: updateTutor,
	remove: deleteTutor,
	getLoggedIn: getLoggedInTutor
} = makeEntityController({
	model: Tutor,
	idParam: "tutorID",
	sessionKey: "tutorID",
	responseKey: "currentTutor"
});
