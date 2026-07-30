// src/composables/useDeleteAccount.ts
import { api, clearCsrfToken } from "@/api";
import { confirmDestructiveAction } from "@/security/confirm";
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
		if (
			!confirmDestructiveAction(
				"Permanently delete this account? This cannot be undone."
			)
		) {
			return false;
		}
		await api.delete(`${endpoint[kind]}/${id}`, {
			withCredentials: true
		});
		clearCsrfToken();
		app.clearSession();
		return true;
	};
}
