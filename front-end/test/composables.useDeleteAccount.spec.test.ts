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
	return { api: mock };
});

describe("useDeleteAccount()", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
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
			const logoutSpy = vi
				.spyOn(app, "logout")
				.mockResolvedValue(undefined);
			(apiMod.api.delete as any).mockResolvedValueOnce({ data: {} });

			const del = useDeleteAccount(kind);
			await del(id);

			expect(apiMod.api.delete).toHaveBeenCalledWith(endpoint, {
				withCredentials: true
			});
			expect(logoutSpy).toHaveBeenCalledTimes(1);
		}
	);
});
