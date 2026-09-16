import { computed, ref } from "vue";
import { api } from "@/api";
import { confirmDestructiveAction } from "@/security/confirm";
import { useAppStore } from "@/stores/app";
import { useUnsavedChanges } from "./useUnsavedChanges";

type Kind = "user" | "tutor" | "admin";
export function useEditable(kind: Kind) {
	const app = useAppStore();
	const editing = ref(false);
	const pending = ref(false);
	const error = ref("");
	const message = ref("");
	const draft = ref<Record<string, any>>({});
	let original: Record<string, any> = {};
	const current = () => (kind === "user" ? app.currentUser : kind === "tutor" ? app.currentTutor : app.currentAdmin);
	const unsaved = computed(
		() =>
			pending.value ||
			(editing.value && ["name", "age", "state"].some((key) => draft.value[key] !== original[key]))
	);
	function toggle() {
		if (pending.value) return;
		if (editing.value) {
			if (unsaved.value && !confirmDestructiveAction("Discard your unsaved profile changes?")) return;
			editing.value = false;
			draft.value = {};
			return;
		}
		original = { ...current() };
		draft.value = { ...original };
		editing.value = true;
		error.value = message.value = "";
	}
	useUnsavedChanges(unsaved);

	async function save(entity: any = draft.value) {
		if (pending.value) return false;
		const revision = app.sessionRevision;
		const submitted = { ...entity };
		const url = kind === "user" ? `/users/user/${entity._id}` : `/${kind}s/${entity._id}`;
		const payload = {
			name: entity.name,
			...(kind !== "admin" && entity.age !== undefined ? { age: String(entity.age) } : {}),
			...(kind !== "admin" && entity.state !== undefined ? { state: entity.state } : {})
		};
		pending.value = true;
		error.value = message.value = "";
		try {
			const { data } = await api.put(url, payload);
			if (revision !== app.sessionRevision) return false;
			const updated =
				kind === "user" ? data.currentUser : kind === "tutor" ? data.currentTutor : data.currentAdmin;
			if (kind === "user") app.setCurrentUser(updated);
			else if (kind === "tutor") app.setCurrentTutor(updated);
			else app.setCurrentAdmin(updated);
			const newer = editing.value && Object.keys(payload).some((key) => draft.value[key] !== submitted[key]);
			if (newer) {
				original = { ...updated };
				message.value = "Saved the submitted changes. Your newer edits are still unsaved.";
			} else {
				editing.value = false;
				draft.value = {};
				message.value = "Profile saved.";
			}
			return true;
		} catch (caught: any) {
			if (revision === app.sessionRevision && caught?.code !== "ERR_CANCELED") {
				error.value =
					caught.response?.data?.message ??
					"The save could not be confirmed. Your edits have been kept; please retry.";
			}
			return false;
		} finally {
			pending.value = false;
		}
	}
	return { editing, draft, pending, error, message, toggle, save };
}
