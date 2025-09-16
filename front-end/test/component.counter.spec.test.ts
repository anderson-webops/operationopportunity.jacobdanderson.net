// test/component.counter.spec.test.ts
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import TheCounter from "../src/components/TheCounter.vue";

describe("TheCounter", () => {
	it("renders initial value & labels", () => {
		const wrapper = mount(TheCounter, { props: { initial: 10 } });
		expect(wrapper.text()).toContain("10");
		expect(wrapper.find("button.inc").text()).toBe("+");
		expect(wrapper.find("button.dec").text()).toBe("-");
	});

	it("increments and decrements", async () => {
		const w = mount(TheCounter, { props: { initial: 0 } });
		await w.get("button.inc").trigger("click");
		expect(w.text()).toContain("1");
		await w.get("button.dec").trigger("click");
		expect(w.text()).toContain("0");
	});

	it("handles multiple clicks", async () => {
		const w = mount(TheCounter, { props: { initial: 5 } });
		await w.get("button.inc").trigger("click");
		await w.get("button.inc").trigger("click");
		await w.get("button.dec").trigger("click");
		expect(w.text()).toContain("6"); // 5 + 1 + 1 - 1
	});
});
