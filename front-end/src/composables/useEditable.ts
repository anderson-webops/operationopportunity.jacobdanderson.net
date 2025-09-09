import axios from "axios";
import { ref } from "vue";
import { useAppStore } from "@/stores/app";

type Kind = "user" | "tutor" | "admin";

export function useEditable(kind: Kind) {
	const app = useAppStore();
	const editing = ref(false);
	let baseline = ""; // original e-mail so we know if it changed

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
		// 1) change-e-mail if needed
		if (!baseline) baseline = entity.email;
		if (entity.email !== baseline) {
			await axios.post(`/accounts/changeEmail/${entity._id}`, {
				email: entity.email
			});
			baseline = entity.email;
		}

		// 2) update the rest of the profile
		const url =
			kind === "user"
				? `/users/user/${entity._id}`
				: kind === "tutor"
					? `/tutors/${entity._id}`
					: `/admins/${entity._id}`;

		await axios.put(url, entity);
		editing.value = false;

		// 3) update Pinia _in-place_ (no extra fetch)
		if (kind === "user") app.setCurrentUser(entity);
		else if (kind === "tutor") app.setCurrentTutor(entity);
		else app.setCurrentAdmin(entity);
	}

	return { editing, toggle, save };
}
