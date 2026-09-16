import { createPinia, setActivePinia } from "pinia";
import { effectScope, ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import { beforeEach, expect, it, vi } from "vitest";
import { api } from "../src/api";
import { useDirectory } from "../src/composables/useDirectory";
import { useAppStore } from "../src/stores/app";
vi.mock("@/api", () => ({ api: { get: vi.fn() }, resetApiSession: vi.fn() }));
const row = (id: string) => ({ _id: id, name: `Account ${id}` });
const page = (items: any[], next: string | null = null, previous: string | null = null) => ({ data: { items, next, previous } });
beforeEach(() => { setActivePinia(createPinia()); vi.resetAllMocks(); });
it("replaces each bounded page, retaining search without a growing history", async () => {
	vi.mocked(api.get).mockResolvedValueOnce(page([row("1")], "next") as any).mockResolvedValueOnce(page([row("2")], "later", "previous") as any).mockResolvedValueOnce(page([row("found")]) as any);
	const scope = effectScope(); const directory = scope.run(() => useDirectory("/users/all"))!;
	await flushPromises(); await directory.next();
	expect(directory.items.value).toEqual([row("2")]); expect(api.get).toHaveBeenLastCalledWith("/users/all", expect.objectContaining({ params: { pageSize: 50, after: "next" } }));
	directory.query.value = "Name"; await directory.search(); expect(directory.items.value).toEqual([row("found")]);
	expect(api.get).toHaveBeenLastCalledWith("/users/all", expect.objectContaining({ params: { pageSize: 50, q: "Name" } }));
	scope.stop(); expect(directory.items.value).toEqual([]);
});
it("ignores and cancels abandoned responses after a search and unmount", async () => {
	let finish!: (value: any) => void;
	vi.mocked(api.get).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }) as any).mockResolvedValueOnce(page([row("new")]) as any);
	const scope = effectScope(); const directory = scope.run(() => useDirectory("/admins"))!;
	const firstSignal = vi.mocked(api.get).mock.calls[0][1]!.signal!;
	directory.query.value = "new"; await directory.search(); expect(firstSignal.aborted).toBe(true);
	finish(page([row("stale")])); await flushPromises(); expect(directory.items.value).toEqual([row("new")]);
	const signal = vi.mocked(api.get).mock.calls[1][1]!.signal!; scope.stop(); expect(signal.aborted).toBe(true); expect(directory.items.value).toEqual([]);
});
it("clears private pages on logout and keeps no request for disabled access", async () => {
	const app = useAppStore(); app.setCurrentAdmin({ _id: "a1", name: "A", email: "a@test", editAdmins: true });
	vi.mocked(api.get).mockResolvedValue(page([row("private")]) as any);
	const scope = effectScope(); const directory = scope.run(() => useDirectory("/admins", () => Boolean(app.currentAdmin)))!;
	await flushPromises(); expect(directory.items.value).toHaveLength(1); app.clearSession(); await flushPromises();
	expect(directory.items.value).toEqual([]); expect(directory.query.value).toBe(""); scope.stop();
});
it("retains prior results on temporary failure, but clears them on access denial", async () => {
	vi.mocked(api.get).mockResolvedValueOnce(page([row("1")]) as any).mockRejectedValueOnce({ response: { status: 503 } }).mockRejectedValueOnce({ response: { status: 403 } });
	const enabled = ref(true), scope = effectScope(); const directory = scope.run(() => useDirectory("/admins", enabled))!;
	await flushPromises(); await directory.refresh(); expect(directory.items.value).toHaveLength(1); expect(directory.error.value).toMatch(/retry/);
	await directory.refresh(); expect(directory.items.value).toEqual([]); scope.stop();
});
