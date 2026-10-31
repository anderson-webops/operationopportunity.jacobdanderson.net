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
	const current = () => {
		if (kind === "user") return app.currentUser;
		if (kind === "tutor") return app.currentTutor;
		return app.currentAdmin;
	};
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
		const active = current();
		original = { ...active };
		draft.value = { ...original };
		editing.value = true;
		error.value = message.value = "";
	}
	useUnsavedChanges(unsaved);

	async function save(entity: any = draft.value) {
		if (pending.value) return false;
		const revision = app.sessionRevision;
		const submitted = { ...entity };
		let url = `/${kind}s/${entity._id}`;
		if (kind === "user") url = `/users/user/${entity._id}`;
		const payload: Record<string, string> = { name: entity.name };
		if (kind !== "admin" && entity.age !== undefined) payload.age = String(entity.age);
		if (kind !== "admin" && entity.state !== undefined) payload.state = entity.state;
		pending.value = true;
		error.value = message.value = "";
		try {
			const { data } = await api.put(url, payload);
			if (revision !== app.sessionRevision) return false;
			let updated: any;
			if (kind === "user") updated = data.currentUser;
			else if (kind === "tutor") updated = data.currentTutor;
			else updated = data.currentAdmin;
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
	return Object.assign({ editing, draft, pending }, { error, message, toggle, save });
}
