import NProgress from "nprogress";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { install } from "../src/modules/nprogress";

describe("navigation progress lifetime", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(async () => {
		NProgress.done();
		await vi.advanceTimersByTimeAsync(2000);
		vi.useRealTimers();
	});

	it("tracks a pending navigation and stops after success without restarting for the same route", async () => {
		let finish: (() => void) | undefined;
		const router = createRouter({
			history: createMemoryHistory(),
			routes: [
				{ path: "/", component: { template: "<p>Home</p>" } },
				{
					path: "/next",
					component: { template: "<p>Next</p>" },
					beforeEnter: () =>
						new Promise<void>((resolve) => {
							finish = resolve;
						})
				}
			]
		});
		install({ app: createApp({}), router });
		await router.push("/");
		const navigation = router.push("/next");
		await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
		expect(NProgress.status).not.toBeNull();
		expect(document.querySelector("#nprogress")).not.toBeNull();
		finish!();
		await navigation;
		await vi.advanceTimersByTimeAsync(2000);
		expect(NProgress.status).toBeNull();
		expect(document.querySelector("#nprogress")).toBeNull();
		await router.push("/next");
		expect(NProgress.status).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("cleans the indicator and trickle timer after a lazy page fails, then permits another navigation", async () => {
		let fail: ((error: Error) => void) | undefined;
		const router = createRouter({
			history: createMemoryHistory(),
			routes: [
				{ path: "/", component: { template: "<p>Home</p>" } },
				{
					path: "/broken",
					component: () =>
						new Promise<never>((_resolve, reject) => {
							fail = reject;
						})
				},
				{ path: "/next", component: { template: "<p>Next</p>" } }
			]
		});
		install({ app: createApp({}), router });
		await router.push("/");
		const navigation = router.push("/broken");
		await vi.waitFor(() => expect(fail).toBeTypeOf("function"));
		expect(NProgress.status).not.toBeNull();
		const rejected = expect(navigation).rejects.toThrow("Synthetic page download failure");
		fail!(new Error("Synthetic page download failure"));
		await rejected;
		expect(router.currentRoute.value.path).toBe("/");
		await vi.advanceTimersByTimeAsync(10000);
		expect(NProgress.status).toBeNull();
		expect(document.querySelector("#nprogress")).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
		await router.push("/next");
		await vi.advanceTimersByTimeAsync(2000);
		expect(router.currentRoute.value.path).toBe("/next");
		expect(document.querySelector("#nprogress")).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});
});
