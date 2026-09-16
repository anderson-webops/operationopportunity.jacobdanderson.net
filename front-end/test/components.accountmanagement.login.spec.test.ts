// components/accountmanagement.login.spec.test.ts
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import AccountManagement from "../src/components/AccountManagement.vue";
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
	return { api: mock, clearCsrfToken: vi.fn(), resetApiSession: vi.fn() };
});

describe("AccountManagement.vue login (happy path)", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it("logs in a user, updates the store, and closes the login modal", async () => {
		const app = useAppStore();
		// Open the login modal (component checks app.loginBlock)
		app.setLoginBlock(true);
		app.setCurrentAdmin({
			_id: "stale-admin",
			name: "Previous account",
			email: "previous@example.com",
			editAdmins: false
		});

		// Mock /accounts/login result with a user
		(apiMod.api.post as any).mockResolvedValueOnce({
			data: {
				currentUser: {
					_id: "u123",
					name: "User",
					email: "user@example.com",
					age: 20,
					state: "GA"
				}
			}
		});

		const wrapper = mount(AccountManagement);

		// Fill form and submit
		await wrapper.get("#uname").setValue("user@example.com");
		await wrapper.get("#psw1").setValue("long-password");
		await wrapper.get("form").trigger("submit.prevent");

		// Assert API call
		expect(apiMod.api.post).toHaveBeenCalledWith(
			"/accounts/login",
			{ email: "user@example.com", password: "long-password", remember: false },
			{ withCredentials: true }
		);

		// Store updated with currentUser and modal closed
		expect(app.currentUser?.email).toBe("user@example.com");
		expect(app.currentAdmin).toBeNull();
		expect(app.currentTutor).toBeNull();
		expect(app.loginBlock).toBe(false);

		// Buttons reflect logged-in state (Logout visible, Login/Signup hidden)
		// These live in TheHeader normally, but AccountManagement just closes the modal.
		// So we assert modal visibility based on class toggling.
		const modal = wrapper.find(".loginForm.modal");
		expect(modal.exists()).toBe(true);
		// When closed, the "showLogin" class should be absent:
		expect(modal.classes()).not.toContain("showLogin");
	});

	it("shows a failed signup in its own form and preserves the entered draft", async () => {
		const app = useAppStore();
		app.setSignupBlock(true);
		vi.mocked(apiMod.api.post).mockRejectedValueOnce({ response: { data: { message: "Temporarily unavailable" } } });
		const wrapper = mount(AccountManagement);
		try {
			for (const [selector, value] of [["#name", "Draft name"], ["#email", "draft@fixture.test"], ["#age", "20"], ["#state", "GA"], ["#psw2", "Synthetic-only-password"], ["#psw-repeat", "Synthetic-only-password"]]) await wrapper.get(selector).setValue(value);
			await wrapper.get(".signupForm form").trigger("submit.prevent");
			await flushPromises();
			expect(wrapper.get(".signupForm .error").text()).toContain("Temporarily unavailable");
			expect((wrapper.get("#name").element as HTMLInputElement).value).toBe("Draft name");
			expect(app.signupBlock).toBe(true);
			expect(app.sessionBusy).toBe(false);
		} finally { wrapper.unmount(); }
	});
});
