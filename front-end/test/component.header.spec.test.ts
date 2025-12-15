import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TheHeader from "../src/components/TheHeader.vue";
import { useAppStore } from "../src/stores/app";

const routerLinkStub = {
	template: "<a><slot /></a>",
	props: ["to"]
};

describe("TheHeader", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it("shows login/signup when logged out and emits events on click", async () => {
		const wrapper = mount(TheHeader, {
			global: {
				stubs: { "router-link": routerLinkStub }
			}
		});

		expect(wrapper.find("button.btn-outline-success").exists()).toBe(true);
		expect(wrapper.find("button.btn-outline-primary").exists()).toBe(true);
		expect(wrapper.find("button.btn-outline-danger").exists()).toBe(false);

		await wrapper.get("button.btn-outline-success").trigger("click");
		await wrapper.get("button.btn-outline-primary").trigger("click");

		expect(wrapper.emitted("loginClick")).toBeTruthy();
		expect(wrapper.emitted("signupClick")).toBeTruthy();
	});

	it("shows logout + profile link when logged in and calls logout", async () => {
		const app = useAppStore();
		app.setCurrentUser({
			_id: "u1",
			name: "Test User",
			email: "t@e.com",
			age: 21,
			state: "CA",
			editUsers: false,
			saveEdit: "Edit"
		});

		const logoutSpy = vi
			.spyOn(app, "logout")
			.mockResolvedValue(undefined);

		const wrapper = mount(TheHeader, {
			global: {
				stubs: { "router-link": routerLinkStub }
			}
		});

		expect(wrapper.find("button.btn-outline-danger").exists()).toBe(true);
		expect(wrapper.find("button.btn-outline-success").exists()).toBe(false);
		expect(wrapper.find("button.btn-outline-primary").exists()).toBe(false);

		await wrapper.get("button.btn-outline-danger").trigger("click");
		expect(logoutSpy).toHaveBeenCalledTimes(1);
	});
});
