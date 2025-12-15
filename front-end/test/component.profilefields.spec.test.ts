import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ProfileFields from "../src/components/ProfileFields.vue";

const fields = [
	{ key: "name", label: "Name" },
	{ key: "email", label: "Email" }
];

describe("ProfileFields", () => {
	it("renders read-only values when not editing", () => {
		const wrapper = mount(ProfileFields, {
			props: {
				fields,
				entity: { name: "Alex", email: "a@e.com" },
				editing: false
			}
		});

		expect(wrapper.text()).toContain("Alex");
		expect(wrapper.text()).toContain("a@e.com");
		expect(wrapper.find("input").exists()).toBe(false);
	});

	it("renders inputs when editing and emits updates on change", async () => {
		const wrapper = mount(ProfileFields, {
			props: {
				fields,
				entity: { name: "Beth", email: "b@e.com" },
				editing: true
			}
		});

		const nameInput = wrapper.get("input.editTutor");
		expect((nameInput.element as HTMLInputElement).value).toBe("Beth");

		await nameInput.setValue("Beatrice");
		expect(wrapper.emitted("update")?.[0]).toEqual(["name", "Beatrice"]);
	});
});
