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
	return { api: mock, clearCsrfToken: vi.fn() };
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
