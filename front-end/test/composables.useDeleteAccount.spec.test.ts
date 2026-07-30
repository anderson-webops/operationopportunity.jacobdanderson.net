import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDeleteAccount } from "../src/composables/useDeleteAccount";
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

describe("useDeleteAccount()", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		vi.spyOn(globalThis, "confirm").mockReturnValue(true);
	});

	const cases = [
		{ kind: "admin", id: "a1", endpoint: "/admins/remove/a1" },
		{ kind: "tutor", id: "t1", endpoint: "/tutors/remove/t1" },
		{ kind: "user", id: "u1", endpoint: "/users/user/u1" }
	] as const;

	it.each(cases)(
		"calls delete %s endpoint then logs out",
		async ({ kind, id, endpoint }) => {
			const app = useAppStore();
			const clearSpy = vi.spyOn(app, "clearSession");
			(apiMod.api.delete as any).mockResolvedValueOnce({ data: {} });

			const del = useDeleteAccount(kind);
			await del(id);

			expect(apiMod.api.delete).toHaveBeenCalledWith(endpoint, {
				withCredentials: true
			});
			expect(clearSpy).toHaveBeenCalledTimes(1);
			expect(apiMod.clearCsrfToken).toHaveBeenCalledTimes(1);
		}
	);

	it("does nothing when deletion is not confirmed", async () => {
		vi.mocked(globalThis.confirm).mockReturnValueOnce(false);
		const del = useDeleteAccount("user");
		expect(await del("u1")).toBe(false);
		expect(apiMod.api.delete).not.toHaveBeenCalled();
		expect(apiMod.clearCsrfToken).not.toHaveBeenCalled();
	});
});
