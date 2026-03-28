import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "../src/pages/index.vue";

describe("HomePage quote flow", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("renders the first quote returned by the API", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => [
				{
					_id: "quote-1",
					content: "Start where you are. Use what you have. Do what you can.",
					author: "Arthur Ashe",
					tags: ["success"],
					authorSlug: "arthur-ashe",
					length: 54,
					dateAdded: "2026-03-27T00:00:00.000Z",
					dateModified: "2026-03-27T00:00:00.000Z"
				}
			]
		});
		vi.stubGlobal("fetch", fetchMock);

		const wrapper = mount(HomePage);
		await flushPromises();

		expect(fetchMock).toHaveBeenCalledWith("/api/quotes?tags=success&limit=100");
		expect(wrapper.find(".quote").text()).toContain("Start where you are. Use what you have. Do what you can.");
		expect(wrapper.find("#quote-author").text()).toContain("Arthur Ashe");
	});

	it("falls back to a local quote when the API request fails", async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
		vi.stubGlobal("fetch", fetchMock);

		const wrapper = mount(HomePage);
		await flushPromises();

		expect(wrapper.find(".quote").text()).toContain("Success is the sum of small efforts, repeated day in and day out.");
		expect(wrapper.find("#quote-author").text()).toContain("Robert Collier");
	});
});
