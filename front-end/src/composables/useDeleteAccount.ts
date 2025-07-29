// src/composables/useDeleteAccount.ts
import axios from "axios";
import { useAppStore } from "@/stores/app";

type Kind = "admin" | "tutor" | "user";

const endpoint: Record<Kind, string> = {
	admin: "/api/admins/remove",
	tutor: "/api/tutors/remove",
	user: "/api/users/user" // this already deletes “self”
};

export function useDeleteAccount(kind: Kind) {
	const app = useAppStore();

	/** delete on the server, then forget the session locally */
	return async function deleteAccount(id: string) {
		await axios.delete(`${endpoint[kind]}/${id}`, {
			withCredentials: tru
		});
		await app.logout(); // clears Pinia + session cookie
	};
}
