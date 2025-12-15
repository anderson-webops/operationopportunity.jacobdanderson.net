import { describe, expect, it, vi } from "vitest";

const start = vi.fn();
const done = vi.fn();

vi.mock("nprogress", () => ({
	default: {
		start,
		done
	}
}));

describe("modules/nprogress install()", () => {
	it("wires router guards to start/stop the progress bar", async () => {
		let beforeEachCb: ((to: any, from: any) => void) | undefined;
		let afterEachCb: (() => void) | undefined;

		const fakeRouter = {
			beforeEach: (fn: any) => (beforeEachCb = fn),
			afterEach: (fn: any) => (afterEachCb = fn)
		};

		const mod = await import("../src/modules/nprogress");
		mod.install({ router: fakeRouter } as any);

		expect(beforeEachCb).toBeTypeOf("function");
		expect(afterEachCb).toBeTypeOf("function");

		beforeEachCb?.({ path: "/b" }, { path: "/a" });
		expect(start).toHaveBeenCalledTimes(1);

		beforeEachCb?.({ path: "/a" }, { path: "/a" });
		expect(start).toHaveBeenCalledTimes(1); // unchanged path → no start

		afterEachCb?.();
		expect(done).toHaveBeenCalledTimes(1);
	});
});
