import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "../src/pages/index.vue";

enableAutoUnmount(afterEach);

describe("HomePage quote flow", () => {
	afterEach(() => {
		vi.useRealTimers();
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

		expect(fetchMock).toHaveBeenCalledWith(
			"/api/quotes?tags=success&random=true&limit=1",
			expect.objectContaining({ signal: expect.any(AbortSignal) })
		);
		expect(wrapper.find(".quote").text()).toContain("Start where you are. Use what you have. Do what you can.");
		expect(wrapper.find("#quote-author").text()).toContain("Arthur Ashe");
	});

	it("falls back to a local quote when the API request fails", async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
		vi.stubGlobal("fetch", fetchMock);

		const wrapper = mount(HomePage);
		await flushPromises();

		expect(wrapper.find(".quote").text()).toContain(
			"Success is the sum of small efforts, repeated day in and day out."
		);
		expect(wrapper.find("#quote-author").text()).toContain("Robert Collier");
	});

	it("shows a quote immediately while the request is pending", () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(() => new Promise(() => {}))
		);
		const wrapper = mount(HomePage);
		expect(wrapper.find(".quote").text()).toContain("Success is the sum of small efforts");
	});

	it.each([
		null,
		{},
		[],
		[null],
		[{ content: {}, author: "Author" }],
		[{ content: " ", author: "Author" }],
		[{ content: "Hello", author: 42 }],
		[{ content: "x".repeat(10_001), author: "Author" }]
	])("keeps the fallback for malformed or empty data: %j", async (data) => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
		const wrapper = mount(HomePage);
		await flushPromises();
		expect(wrapper.find("#quote-author").text()).toBe("Robert Collier");
	});

	it("ignores invalid entries and displays valid text without interpreting HTML", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => [null, { content: " <script>alert(1)</script> ", author: " Author " }]
			})
		);
		const wrapper = mount(HomePage);
		await flushPromises();
		expect(wrapper.find(".quote-text").text()).toBe("<script>alert(1)</script>");
		expect(wrapper.find(".quote script").exists()).toBe(false);
		expect(wrapper.find("#quote-author").text()).toBe("Author");
	});

	it.each([400, 429, 502])("keeps the fallback without reading an HTTP %i error body", async () => {
		const json = vi.fn();
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json }));
		const wrapper = mount(HomePage);
		await flushPromises();
		expect(wrapper.find("#quote-author").text()).toBe("Robert Collier");
		expect(json).not.toHaveBeenCalled();
	});

	it("keeps the fallback for invalid JSON", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => {
					throw new SyntaxError();
				}
			})
		);
		const wrapper = mount(HomePage);
		await flushPromises();
		expect(wrapper.find("#quote-author").text()).toBe("Robert Collier");
	});

	it("cancels a slow request and ignores a late response", async () => {
		vi.useFakeTimers();
		let finish!: (value: unknown) => void;
		const fetchMock = vi.fn(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				})
		);
		vi.stubGlobal("fetch", fetchMock);
		const wrapper = mount(HomePage);
		const signal = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].signal!;
		await vi.advanceTimersByTimeAsync(10_000);
		expect(signal.aborted).toBe(true);
		finish({ ok: true, json: async () => [{ content: "Too late", author: "Late author" }] });
		await flushPromises();
		expect(wrapper.find("#quote-author").text()).toBe("Robert Collier");
	});

	it("cancels the request and clears its timer when leaving the page", () => {
		vi.useFakeTimers();
		const fetchMock = vi.fn(() => new Promise(() => {}));
		vi.stubGlobal("fetch", fetchMock);
		const wrapper = mount(HomePage);
		const signal = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].signal!;
		wrapper.unmount();
		expect(signal.aborted).toBe(true);
		expect(vi.getTimerCount()).toBe(0);
	});
});
