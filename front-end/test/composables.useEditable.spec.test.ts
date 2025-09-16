// composables/useEditable.spec.test.ts
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEditable } from "../src/composables/useEditable";
import { useAppStore } from "../src/stores/app";
import * as apiMod from "../src/api";

// Mock the axios client we export from "@/api"
vi.mock("@/api", () => {
	const mock = {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		defaults: { baseURL: "/api", withCredentials: true }
	};
	return { api: mock };
});

describe("useEditable()", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it("user: calls changeEmail only when email actually changes, PUTs to /users/user/:id, and updates store", async () => {
		const app = useAppStore();

		const { save } = useEditable("user");
		const entity = {
			_id: "u1",
			name: "Jane",
			email: "jane@ex.com",
			age: 22,
			state: "GA"
		};

		// First save (baseline set, no changeEmail)
		(apiMod.api.put as any).mockResolvedValueOnce({ data: {} });
		await save(entity);

		expect(apiMod.api.post).not.toHaveBeenCalledWith(
			expect.stringContaining("/accounts/changeEmail/"),
			expect.anything()
		);
		expect(apiMod.api.put).toHaveBeenCalledWith("/users/user/u1", entity);
		expect(app.currentUser?.email).toBe("jane@ex.com");

		// Change email, save again → changeEmail then PUT
		entity.email = "jane+new@ex.com";
		(apiMod.api.post as any).mockResolvedValueOnce({ data: {} }); // changeEmail
		(apiMod.api.put as any).mockResolvedValueOnce({ data: {} }); // update profile

		await save(entity);

		expect(apiMod.api.post).toHaveBeenCalledWith(
			"/accounts/changeEmail/u1",
			{
				email: "jane+new@ex.com"
			}
		);
		expect(apiMod.api.put).toHaveBeenCalledWith("/users/user/u1", entity);
		expect(app.currentUser?.email).toBe("jane+new@ex.com");
	});

	it("tutor: PUTs to /tutors/:id and updates store (no email change)", async () => {
		const app = useAppStore();

		const { save } = useEditable("tutor");
		const tutor = {
			_id: "t1",
			name: "Tim",
			email: "tim@ex.com",
			age: 30,
			state: "UT"
		};

		(apiMod.api.put as any).mockResolvedValueOnce({ data: {} });
		await save(tutor);

		expect(apiMod.api.post).not.toHaveBeenCalled();
		expect(apiMod.api.put).toHaveBeenCalledWith("/tutors/t1", tutor);
		expect(app.currentTutor?._id).toBe("t1");
	});

	it("admin: PUTs to /admins/:id and updates store (no email change)", async () => {
		const app = useAppStore();

		const { save } = useEditable("admin");
		const admin = {
			_id: "a1",
			name: "Ada",
			email: "ada@ex.com",
			state: "NY",
			// extra fields tolerated by the store
			editAdmins: false,
			saveEdit: "Edit"
		};

		(apiMod.api.put as any).mockResolvedValueOnce({ data: {} });
		await save(admin);

		expect(apiMod.api.post).not.toHaveBeenCalled();
		expect(apiMod.api.put).toHaveBeenCalledWith("/admins/a1", admin);
		expect(app.currentAdmin?._id).toBe("a1");
	});
});
