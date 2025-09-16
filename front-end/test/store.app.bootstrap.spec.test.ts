// test/store.app.bootstrap.spec.test.ts
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../src/stores/app";
import * as apiMod from "../src/api";

// mock axios client
vi.mock("@/api", () => {
	const mock = {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn()
	};
	return { api: mock };
});

describe("app store bootstrapSession()", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it("hydrates admin", async () => {
		(apiMod.api.get as any)
			.mockResolvedValueOnce({ data: { adminID: "a1" } }) // /accounts/me
			.mockResolvedValueOnce({
				data: { currentAdmin: { _id: "a1", name: "A" } }
			}); // /admins/loggedin

		const app = useAppStore();
		await app.bootstrapSession();

		expect(app.currentAdmin?._id).toBe("a1");
		expect(app.currentUser).toBeNull();
		expect(app.currentTutor).toBeNull();
	});

	it("clears session on error", async () => {
		(apiMod.api.get as any).mockRejectedValueOnce(new Error("no cookie"));

		const app = useAppStore();
		await app.bootstrapSession();

		expect(app.currentAdmin).toBeNull();
		expect(app.currentTutor).toBeNull();
		expect(app.currentUser).toBeNull();
	});
});
