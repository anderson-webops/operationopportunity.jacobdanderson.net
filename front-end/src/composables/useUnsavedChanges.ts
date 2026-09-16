import type { MaybeRefOrGetter } from "vue";
import { getCurrentInstance, onScopeDispose, toValue, watch } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { confirmDestructiveAction } from "@/security/confirm";
import { useAppStore } from "@/stores/app";

/** Store only a count globally; drafts and event listeners belong to their view. */
export function useUnsavedChanges(dirty: MaybeRefOrGetter<boolean>) {
	if (!getCurrentInstance()) return;
	const app = useAppStore();
	let counted = false;
	watch(
		() => toValue(dirty),
		(value) => {
			if (value === counted) return;
			app.unsavedCount += value ? 1 : -1;
			counted = value;
		},
		{ immediate: true, flush: "sync" }
	);
	const beforeUnload = (event: BeforeUnloadEvent) => {
		if (toValue(dirty)) {
			event.preventDefault();
			event.returnValue = "";
		}
	};
	window.addEventListener("beforeunload", beforeUnload);
	onBeforeRouteLeave(
		() => !toValue(dirty) || confirmDestructiveAction("Leave with changes that have not been saved?")
	);
	onScopeDispose(() => {
		window.removeEventListener("beforeunload", beforeUnload);
		if (counted) app.unsavedCount--;
	});
}
