import { ref } from "vue";
import { api } from "@/api";
import { useAppStore } from "@/stores/app";

type Kind = "user" | "tutor" | "admin";

export function useEditable(kind: Kind) {
	const app = useAppStore();
	const editing = ref(false);

	/* ----------------------------------------- */
	/*  toggle between view / edit               */

	/* ----------------------------------------- */
	function toggle() {
		editing.value = !editing.value;
	}

	/* ----------------------------------------- */
	/*  save profile to the server               */

	/* ----------------------------------------- */
	async function save(entity: any) {
		const url =
			kind === "user"
				? `/users/user/${entity._id}`
				: kind === "tutor"
					? `/tutors/${entity._id}`
					: `/admins/${entity._id}`;

		const payload = {
			name: entity.name,
			...(kind !== "admin" && entity.age !== undefined
				? { age: String(entity.age) }
				: {}),
			...(kind !== "admin" && entity.state !== undefined
				? { state: entity.state }
				: {})
		};
		const { data } = await api.put(url, payload);
		const updated =
			kind === "user"
				? data.currentUser
				: kind === "tutor"
					? data.currentTutor
					: data.currentAdmin;
		editing.value = false;

		if (kind === "user") app.setCurrentUser(updated);
		else if (kind === "tutor") app.setCurrentTutor(updated);
		else app.setCurrentAdmin(updated);
	}

	return { editing, toggle, save };
}
