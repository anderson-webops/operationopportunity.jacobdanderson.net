import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChangeCredentials from "../src/components/ChangeCredentials.vue";
import { useAppStore } from "../src/stores/app";
import * as apiMod from "../src/api";

vi.mock("@/api", () => ({
	api: {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn()
	},
	clearCsrfToken: vi.fn()
}));

describe("ChangeCredentials", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it("requires the current password and replaces only the signed-in account", async () => {
		const account = {
			_id: "u1",
			name: "User",
			email: "old@example.com",
			age: 20,
			state: "GA"
		};
		(apiMod.api.put as any).mockResolvedValueOnce({
			data: { currentUser: { ...account, email: "new@example.com" } }
		});
		const wrapper = mount(ChangeCredentials, {
			props: { kind: "user", account }
		});

		await wrapper.get('input[type="email"]').setValue("new@example.com");
		const passwordInputs = wrapper.findAll('input[type="password"]');
		await passwordInputs[0]!.setValue("existing-password");
		await passwordInputs[1]!.setValue("replacement-password");
		await passwordInputs[2]!.setValue("replacement-password");
		await wrapper.get("form").trigger("submit.prevent");

		expect(apiMod.api.put).toHaveBeenCalledWith("/users/user/u1", {
			currentPassword: "existing-password",
			email: "new@example.com",
			password: "replacement-password"
		});
		expect(useAppStore().currentUser?.email).toBe("new@example.com");
	});

	it("does not submit mismatched new passwords", async () => {
		const wrapper = mount(ChangeCredentials, {
			props: {
				kind: "admin",
				account: {
					_id: "a1",
					name: "Admin",
					email: "admin@example.com",
					editAdmins: true
				}
			}
		});
		const passwordInputs = wrapper.findAll('input[type="password"]');
		await passwordInputs[0]!.setValue("existing-password");
		await passwordInputs[1]!.setValue("replacement-one");
		await passwordInputs[2]!.setValue("replacement-two");
		await wrapper.get("form").trigger("submit.prevent");

		expect(apiMod.api.put).not.toHaveBeenCalled();
		expect(wrapper.text()).toContain("New passwords do not match.");
	});
});
