import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEditable } from "../src/composables/useEditable";
import { useAppStore } from "../src/stores/app";
import * as apiMod from "../src/api";

vi.mock("@/api", () => {
	const mock = {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		defaults: { baseURL: "/api", withCredentials: true }
	};
	return { api: mock, clearCsrfToken: vi.fn(), resetApiSession: vi.fn() };
});

describe("useEditable()", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it("updates a user through one whitelisted profile request", async () => {
		const app = useAppStore();
		const { save } = useEditable("user");
		const entity = {
			_id: "u1",
			name: "Jane",
			email: "jane@ex.com",
			age: 22,
			state: "GA",
			role: "admin"
		};
		(apiMod.api.put as any).mockResolvedValueOnce({
			data: { currentUser: { ...entity, role: undefined } }
		});

		await save(entity);

		expect(apiMod.api.post).not.toHaveBeenCalled();
		expect(apiMod.api.put).toHaveBeenCalledWith("/users/user/u1", {
			name: "Jane",
			age: "22",
			state: "GA"
		});
		expect(app.currentUser?.email).toBe("jane@ex.com");
	});

	it("updates a tutor without sending server-owned status or role fields", async () => {
		const app = useAppStore();
		const { save } = useEditable("tutor");
		const tutor = {
			_id: "t1",
			name: "Tim",
			email: "tim@ex.com",
			age: 30,
			state: "UT",
			status: "active",
			role: "admin"
		};
		(apiMod.api.put as any).mockResolvedValueOnce({
			data: { currentTutor: tutor }
		});

		await save(tutor);

		expect(apiMod.api.put).toHaveBeenCalledWith("/tutors/t1", {
			name: "Tim",
			age: "30",
			state: "UT"
		});
		expect(app.currentTutor?._id).toBe("t1");
	});

	it("updates an admin without sending privilege fields", async () => {
		const app = useAppStore();
		const { save } = useEditable("admin");
		const admin = {
			_id: "a1",
			name: "Ada",
			email: "ada@ex.com",
			editAdmins: false
		};
		(apiMod.api.put as any).mockResolvedValueOnce({
			data: { currentAdmin: admin }
		});

		await save(admin);

		expect(apiMod.api.put).toHaveBeenCalledWith("/admins/a1", {
			name: "Ada"
		});
		expect(app.currentAdmin?._id).toBe("a1");
	});
});

describe("profile draft lifetime", () => {
	beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks(); });
	it("retains newer typing when an earlier save finishes", async () => {
		const app = useAppStore(); const original = { _id: "a1", name: "Original", email: "a@example.test", editAdmins: false };
		app.setCurrentAdmin(original);
		const editor = useEditable("admin"); editor.toggle(); editor.draft.value.name = "Submitted";
		let finish!: (value: any) => void;
		(apiMod.api.put as any).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
		const saving = editor.save(); editor.draft.value.name = "Newer typing";
		finish({ data: { currentAdmin: { ...original, name: "Submitted" } } }); await saving;
		expect(app.currentAdmin?.name).toBe("Submitted"); expect(editor.draft.value.name).toBe("Newer typing");
		expect(editor.editing.value).toBe(true); expect(editor.message.value).toMatch(/unsaved/);
	});
	it("retains a draft after a failed save and does not mutate the displayed account", async () => {
		const app = useAppStore(); app.setCurrentAdmin({ _id: "a1", name: "Original", email: "a@example.test", editAdmins: false });
		const editor = useEditable("admin"); editor.toggle(); editor.draft.value.name = "Draft";
		(apiMod.api.put as any).mockRejectedValueOnce(new Error("connection lost")); await editor.save();
		expect(app.currentAdmin?.name).toBe("Original"); expect(editor.draft.value.name).toBe("Draft"); expect(editor.error.value).toMatch(/kept/);
	});
	it("does not restore an account after logout during an accepted save", async () => {
		const app = useAppStore(); const original = { _id: "a1", name: "Original", email: "a@example.test", editAdmins: false }; app.setCurrentAdmin(original);
		const editor = useEditable("admin"); editor.toggle(); let finish!: (value: any) => void;
		(apiMod.api.put as any).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
		const saving = editor.save(); app.clearSession(); finish({ data: { currentAdmin: original } }); await saving;
		expect(app.currentAdmin).toBeNull();
	});
});
