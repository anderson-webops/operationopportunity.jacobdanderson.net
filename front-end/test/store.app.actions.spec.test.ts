import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../src/stores/app";
import * as apiMod from "../src/api";

vi.mock("@/api", () => {
	const mock = {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn()
	};
	return { api: mock, clearCsrfToken: vi.fn() };
});

describe("app store actions", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it("fetchUsers populates the users array", async () => {
		(apiMod.api.get as any).mockResolvedValueOnce({
			data: [{ _id: "u1", name: "User", email: "u@e.com", age: 20, state: "CA" }]
		});
		const app = useAppStore();
		await app.fetchUsers();

		expect(apiMod.api.get).toHaveBeenCalledWith("/users/all");
		expect(app.users).toHaveLength(1);
		expect(app.users[0]._id).toBe("u1");
	});

	it("fetchTutors populates tutors array", async () => {
		(apiMod.api.get as any).mockResolvedValueOnce({
			data: [{ _id: "t1", name: "Tutor", state: "NY", status: "active" }]
		});
		const app = useAppStore();
		await app.fetchTutors();

		expect(apiMod.api.get).toHaveBeenCalledWith("/tutors");
		expect(app.tutors).toHaveLength(1);
		expect(app.tutors[0]._id).toBe("t1");
	});

	it("getUsersOfTutor fetches users for the current tutor", async () => {
		(apiMod.api.get as any).mockResolvedValueOnce({
			data: [{ _id: "u2", name: "Student", email: "s@e.com", age: 18, state: "AZ" }]
		});
		const app = useAppStore();
		app.setCurrentTutor({
			_id: "t55",
			name: "Tutor",
			email: "t@e.com",
			age: 40,
			state: "IL",
			status: "active"
		});

		await app.getUsersOfTutor();

		expect(apiMod.api.get).toHaveBeenCalledWith("/users/oftutor/t55");
		expect(app.users[0]._id).toBe("u2");
	});

	it("logout clears all session state", async () => {
		(apiMod.api.delete as any).mockResolvedValueOnce({});
		const app = useAppStore();
		app.setCurrentAdmin({ _id: "a1", name: "A", email: "a@e.com", editAdmins: false });
		app.setCurrentTutor({ _id: "t1", name: "T", email: "t@e.com", age: 40, state: "TX", status: "active" });
		app.setCurrentUser({ _id: "u1", name: "U", email: "u@e.com", age: 21, state: "CA" });
		app.setError("boom");

		await app.logout();

		expect(apiMod.api.delete).toHaveBeenCalledWith("/accounts/logout");
		expect(apiMod.clearCsrfToken).toHaveBeenCalledTimes(1);
		expect(app.currentAdmin).toBeNull();
		expect(app.currentTutor).toBeNull();
		expect(app.currentUser).toBeNull();
		expect(app.error).toBeNull();
	});

	it("preserves session state when server-side logout cannot be confirmed", async () => {
		(apiMod.api.delete as any).mockRejectedValueOnce(new Error("network unavailable"));
		const app = useAppStore();
		app.setCurrentAdmin({
			_id: "a1",
			name: "A",
			email: "a@e.com",
			editAdmins: false
		});

		await expect(app.logout()).resolves.toBe(false);

		expect(apiMod.clearCsrfToken).not.toHaveBeenCalled();
		expect(app.currentAdmin?._id).toBe("a1");
		expect(app.error).toMatch(/could not be confirmed/i);
	});

	it("clears local state when logout confirms the session is already expired", async () => {
		(apiMod.api.delete as any).mockRejectedValueOnce({
			response: { status: 401 }
		});
		const app = useAppStore();
		app.setCurrentAdmin({
			_id: "a1",
			name: "A",
			email: "a@e.com",
			editAdmins: false
		});

		await expect(app.logout()).resolves.toBe(true);

		expect(apiMod.clearCsrfToken).toHaveBeenCalledTimes(1);
		expect(app.currentAdmin).toBeNull();
		expect(app.error).toBeNull();
	});
});
