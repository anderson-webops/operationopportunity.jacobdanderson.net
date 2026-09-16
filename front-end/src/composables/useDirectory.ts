import type { MaybeRefOrGetter } from "vue";
import { onScopeDispose, ref, shallowRef, toValue, watch } from "vue";
import { api } from "@/api";
import { useAppStore } from "@/stores/app";

export function useDirectory<T extends { _id: string; name: string }>(
	endpoint: MaybeRefOrGetter<string>,
	enabled: MaybeRefOrGetter<boolean> = true
) {
	const app = useAppStore();
	const items = shallowRef<T[]>([]);
	const query = ref("");
	const loading = ref(false);
	const error = ref("");
	const nextCursor = ref<string | null>(null);
	const previousCursor = ref<string | null>(null);
	let controller: AbortController | undefined;
	let sequence = 0;
	let current: Record<string, string> = {};
	async function load(params: Record<string, string> = {}) {
		controller?.abort();
		const request = ++sequence;
		if (!toValue(enabled)) return;
		controller = new AbortController();
		loading.value = true;
		error.value = "";
		try {
			const { data } = await api.get(toValue(endpoint), {
				params: { pageSize: 50, ...params },
				signal: controller.signal
			});
			if (request !== sequence) return;
			if (
				!data ||
				!Array.isArray(data.items) ||
				data.items.length > 50 ||
				data.items.some(
					(item: any) => !item || typeof item._id !== "string" || typeof item.name !== "string"
				) ||
				![data.next, data.previous].every(
					(value) => value === null || (typeof value === "string" && value.length <= 1024)
				)
			) {
				throw new Error("Invalid directory response");
			}
			items.value = data.items;
			nextCursor.value = data.next;
			previousCursor.value = data.previous;
			current = params;
		} catch (caught: any) {
			if (request !== sequence || caught?.code === "ERR_CANCELED") return;
			if ([401, 403].includes(caught?.response?.status)) {
				items.value = [];
				nextCursor.value = previousCursor.value = null;
			}
			error.value = "The directory could not be refreshed. Please retry.";
		} finally {
			if (request === sequence) loading.value = false;
		}
	}
	function clear() {
		sequence++;
		controller?.abort();
		controller = undefined;
		items.value = [];
		nextCursor.value = previousCursor.value = null;
		loading.value = false;
		error.value = "";
		current = {};
		query.value = "";
	}
	watch(
		() => [toValue(endpoint), toValue(enabled), app.sessionRevision],
		() => {
			clear();
			void load();
		},
		{ immediate: true, flush: "sync" }
	);
	onScopeDispose(clear);
	return {
		items,
		query,
		loading,
		error,
		nextCursor,
		previousCursor,
		search: () => load(query.value.trim() ? { q: query.value.trim() } : {}),
		refresh: () => load(current),
		next: () =>
			nextCursor.value
				? load({ ...(current.q ? { q: current.q } : {}), after: nextCursor.value })
				: Promise.resolve(),
		previous: () =>
			previousCursor.value
				? load({ ...(current.q ? { q: current.q } : {}), before: previousCursor.value })
				: Promise.resolve()
	};
}
