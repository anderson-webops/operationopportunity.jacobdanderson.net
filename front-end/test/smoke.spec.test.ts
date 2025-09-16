// test/smoke.spec.test.ts
import { mount } from "@vue/test-utils";
import { expect, it } from "vitest";
import TheCounter from "../src/components/TheCounter.vue";

it("mounts a Vue component", () => {
	const wrapper = mount(TheCounter, { props: { initial: 0 } });
	expect(wrapper.exists()).toBe(true);
});
