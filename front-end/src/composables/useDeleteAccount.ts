// src/composables/useDeleteAccount.ts
import { api } from "@/api";
import { useAppStore } from "@/stores/app";

type Kind = "admin" | "tutor" | "user";

const endpoint: Record<Kind, string> = {
	admin: "/admins/remove",
	tutor: "/tutors/remove",
	user: "/users/user" // this already deletes “self”
};

export function useDeleteAccount(kind: Kind) {
	const app = useAppStore();

	/** delete on the server, then forget the session locally */
	return async function deleteAccount(id: string) {
		await api.delete(`${endpoint[kind]}/${id}`, {
			withCredentials: true
		});
		await app.logout(); // clears Pinia + session cookie
	};
}
