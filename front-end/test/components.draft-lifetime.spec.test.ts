import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h, ref } from "vue";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "../src/api";
import AdminProfile from "../src/components/AdminProfile.vue";
import UserSignup from "../src/components/UserSignup.vue";
import { useUnsavedChanges } from "../src/composables/useUnsavedChanges";
import { useAppStore } from "../src/stores/app";

vi.mock("@/api", () => ({ api: { get: vi.fn(), put: vi.fn() }, resetApiSession: vi.fn() }));
afterEach(() => vi.restoreAllMocks());
async function view(component: any, initialize: (app: ReturnType<typeof useAppStore>) => void) {
	const pinia = createPinia();
	setActivePinia(pinia);
	const app = useAppStore();
	initialize(app);
	const router = createRouter({ history: createMemoryHistory(), routes: [
		{ path: "/", component }, { path: "/away", component: { render: () => h("p", "Away") } }
	] });
	await router.push("/");
	const wrapper = mount({ render: () => h(RouterView) }, { global: { plugins: [pinia, router] } });
	await flushPromises();
	return { wrapper, router, app };
}

it("a delayed current-tutor lookup cannot replace a newer unsaved selection", async () => {
	const oldTutor = { _id: "old", name: "Old tutor" }, newTutor = { _id: "new", name: "New tutor" };
	let finish!: (value: any) => void;
	vi.mocked(api.get).mockImplementation((_url, config) => config?.params?.id
		? new Promise((resolve) => { finish = resolve; })
		: Promise.resolve({ data: { items: [oldTutor, newTutor], next: null, previous: null } }) as any);
	const { wrapper, app } = await view(UserSignup, (store) => store.setCurrentUser({ _id: "user", name: "User", email: "user@fixture.test", age: 20, state: "GA", tutor: "old" }));
	try {
		await wrapper.get("select").setValue("new");
		expect(app.unsavedCount).toBe(1);
		finish({ data: { items: [oldTutor] } });
		await flushPromises();
		expect((wrapper.get("select").element as HTMLSelectElement).value).toBe("new");
		expect(app.currentUser?.tutor).toBe("old");
	} finally { wrapper.unmount(); }
	expect(app.unsavedCount).toBe(0);
});

it("revoking admin management clears the hidden creation draft, including its password", async () => {
	vi.mocked(api.get).mockResolvedValue({ data: { items: [], next: null, previous: null } });
	const admin = { _id: "admin", name: "Manager", email: "manager@fixture.test", editAdmins: true };
	const { wrapper, app } = await view(AdminProfile, (store) => store.setCurrentAdmin(admin));
	try {
		await wrapper.get(".admin-create input[type=password]").setValue("Synthetic-only-password");
		expect(app.unsavedCount).toBe(1);
		app.setCurrentAdmin({ ...admin, editAdmins: false });
		await flushPromises();
		expect(wrapper.find(".admin-create").exists()).toBe(false);
		expect(app.unsavedCount).toBe(0);
		app.setCurrentAdmin(admin);
		await flushPromises();
		expect((wrapper.get(".admin-create input[type=password]").element as HTMLInputElement).value).toBe("");
	} finally { wrapper.unmount(); }
});

it("route cancellation preserves drafts and repeated disposal removes every unload listener", async () => {
	const added = vi.spyOn(window, "addEventListener"), removed = vi.spyOn(window, "removeEventListener");
	const confirm = vi.spyOn(globalThis, "confirm").mockReturnValue(false);
	for (let index = 0; index < 12; index++) {
		const dirty = ref(true);
		const component = defineComponent({ setup() { useUnsavedChanges(dirty); return () => h("p", "Draft"); } });
		const { wrapper, router, app } = await view(component, () => {});
		try {
			expect(app.unsavedCount).toBe(1);
			const unload = new Event("beforeunload", { cancelable: true });
			window.dispatchEvent(unload);
			expect(unload.defaultPrevented).toBe(true);
			confirm.mockReturnValue(false);
			await router.push("/away");
			expect(router.currentRoute.value.path).toBe("/");
			expect(app.unsavedCount).toBe(1);
			confirm.mockReturnValue(true);
			await router.push("/away");
			await flushPromises();
			expect(app.unsavedCount).toBe(0);
		} finally { wrapper.unmount(); }
		expect(app.unsavedCount).toBe(0);
	}
	const listeners = added.mock.calls.filter(([name]) => name === "beforeunload").map(([, listener]) => listener);
	expect(listeners).toHaveLength(12);
	for (const listener of listeners) expect(removed.mock.calls.some(([name, fn]) => name === "beforeunload" && fn === listener)).toBe(true);
	const unload = new Event("beforeunload", { cancelable: true });
	window.dispatchEvent(unload);
	expect(unload.defaultPrevented).toBe(false);
});
