import { flushPromises } from "@vue/test-utils";
import { expect, it, vi } from "vitest";
function deferred() { let resolve!: (value: any) => void; let reject!: (value: any) => void; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
async function fixture() {
	vi.resetModules();
	const axios = (await import("axios")).default;
	const calls: Array<{ config: any; work: ReturnType<typeof deferred> }> = [];
	axios.defaults.adapter = ((config: any) => { const work = deferred(); calls.push({ config, work }); return work.promise; }) as any;
	const api = await import("../src/api");
	const complete = (index: number, data: any, headers: any = {}) => calls[index].work.resolve({ data, headers, config: calls[index].config, status: 200, statusText: "OK" });
	return { ...api, calls, complete, axios };
}
it("cancels stale reads and prevents old responses from supplying a new session token", async () => {
	const f = await fixture();
	const read = f.api.get("/admins"); const rejected = expect(read).rejects.toMatchObject({ code: "ERR_CANCELED" });
	await flushPromises(); const signal = f.calls[0].config.signal;
	f.resetApiSession(); expect(signal.aborted).toBe(true);
	f.complete(0, [{ name: "Old private account" }], { "x-csrf-token": "old" }); await rejected;
	const write = f.api.post("/users", {}); await flushPromises(); expect(f.calls[1].config.url).toBe("/accounts/csrf");
	f.complete(1, { csrfToken: "new" }); await flushPromises(); expect(f.calls[2].config.headers.get("X-CSRF-Token")).toBe("new");
	f.complete(2, {}); await write;
});
it("an old CSRF request cannot replace or clear a newer shared request", async () => {
	const f = await fixture();
	const old = f.api.post("/old", {}); const cancelled = expect(old).rejects.toMatchObject({ code: "ERR_CANCELED" });
	await flushPromises(); f.resetApiSession();
	const newer = f.api.post("/new", {}); await flushPromises();
	f.complete(0, { csrfToken: "old" }); await cancelled;
	const shared = f.api.post("/another", {}); await flushPromises(); expect(f.calls).toHaveLength(2);
	f.complete(1, { csrfToken: "new" }); await flushPromises(); expect(f.calls).toHaveLength(4);
	for (const index of [2, 3]) { expect(f.calls[index].config.headers.get("X-CSRF-Token")).toBe("new"); f.complete(index, {}); }
	await Promise.all([newer, shared]);
});
it("does not replay an accepted old-session write or a late CSRF rejection", async () => {
	const f = await fixture();
	const write = f.api.put("/admins/a1", {}); const rejected = expect(write).rejects.toMatchObject({ code: "ERR_CANCELED" });
	await flushPromises(); f.complete(0, { csrfToken: "before" }); await flushPromises();
	f.resetApiSession();
	f.calls[1].work.reject(new f.axios.AxiosError("fixture", "ERR_BAD_REQUEST", f.calls[1].config, undefined, { config: f.calls[1].config, status: 403, statusText: "Denied", headers: {}, data: { error: "request_rejected" } }));
	await rejected; expect(f.calls).toHaveLength(2);
});
it("retries a same-session CSRF rejection once before any mutation", async () => {
	const f = await fixture(); const write = f.api.put("/users/user/u1", {});
	await flushPromises(); f.complete(0, { csrfToken: "first" }); await flushPromises();
	f.calls[1].work.reject(new f.axios.AxiosError("fixture", "ERR_BAD_REQUEST", f.calls[1].config, undefined, { config: f.calls[1].config, status: 403, statusText: "Denied", headers: {}, data: { error: "request_rejected" } }));
	await flushPromises(); expect(f.calls[2].config.url).toBe("/accounts/csrf"); f.complete(2, { csrfToken: "second" }); await flushPromises();
	expect(f.calls[3].config.headers.get("X-CSRF-Token")).toBe("second"); f.complete(3, { saved: true });
	await expect(write).resolves.toMatchObject({ data: { saved: true } }); expect(f.calls).toHaveLength(4);
});
