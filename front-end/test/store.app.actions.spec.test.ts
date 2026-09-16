import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../src/stores/app";
import { api, resetApiSession } from "../src/api";
vi.mock("@/api", () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }, resetApiSession: vi.fn() }));
const admin = { _id: "a1", name: "Admin", email: "a@example.test", editAdmins: true };
function pending() { let resolve!: (value: any) => void; const promise = new Promise((done) => { resolve = done; }); return { resolve, promise }; }
describe("session-owned application state", () => {
	beforeEach(() => { setActivePinia(createPinia()); vi.resetAllMocks(); });
	it("switches identities atomically and retains no directory arrays", () => {
		const app = useAppStore(); app.setCurrentAdmin(admin);
		app.setCurrentUser({ _id: "u1", name: "User", email: "u@example.test", age: 20, state: "GA" });
		expect(app.currentAdmin).toBeNull(); expect(app.currentTutor).toBeNull();
		expect(app.currentUser?._id).toBe("u1");
		for (const key of ["users", "tutors", "admins"]) expect(app.$state).not.toHaveProperty(key);
	});
	it("does not restore an old account when a read finishes after logout", async () => {
		const app = useAppStore(); app.setCurrentAdmin(admin);
		const read = pending(); vi.mocked(api.get).mockReturnValueOnce(read.promise as any);
		const refreshing = app.refreshCurrentAdmin(); app.clearSession();
		read.resolve({ data: { currentAdmin: admin } }); await refreshing;
		expect(app.currentAdmin).toBeNull();
	});
	it("does not replace a confirmed profile update with an older refresh", async () => {
		const app = useAppStore(); app.setCurrentAdmin(admin);
		const read = pending(); vi.mocked(api.get).mockReturnValueOnce(read.promise as any);
		const refreshing = app.refreshCurrentAdmin(); app.setCurrentAdmin({ ...admin, name: "Updated" });
		read.resolve({ data: { currentAdmin: admin } }); await refreshing;
		expect(app.currentAdmin?.name).toBe("Updated");
	});
	it("keeps the current account on temporary authentication-store failure", async () => {
		const app = useAppStore(); app.setCurrentAdmin(admin);
		vi.mocked(api.get).mockRejectedValueOnce({ response: { status: 503 } });
		await app.refreshCurrentAdmin(); expect(app.currentAdmin).toEqual(admin); expect(app.error).toMatch(/kept/);
	});
	it("clears private identity when expiry is confirmed", async () => {
		const app = useAppStore(); app.setCurrentAdmin(admin);
		vi.mocked(api.get).mockRejectedValueOnce({ response: { status: 401 } });
		await app.refreshCurrentAdmin(); expect(app.currentAdmin).toBeNull();
	});
	it("clears session state and cancels reads after confirmed logout", async () => {
		const app = useAppStore(); app.setCurrentAdmin(admin); vi.mocked(resetApiSession).mockClear();
		vi.mocked(api.delete).mockResolvedValueOnce({} as any);
		await expect(app.logout()).resolves.toBe(true);
		expect(app.currentAdmin).toBeNull(); expect(resetApiSession).toHaveBeenCalledOnce(); expect(app.sessionBusy).toBe(false);
	});
	it("keeps identity on unconfirmed logout and permits retry", async () => {
		const app = useAppStore(); app.setCurrentAdmin(admin); vi.mocked(resetApiSession).mockClear();
		vi.mocked(api.delete).mockRejectedValueOnce(new Error("network unavailable"));
		await expect(app.logout()).resolves.toBe(false); expect(app.currentAdmin).toEqual(admin);
		expect(resetApiSession).not.toHaveBeenCalled(); expect(app.sessionBusy).toBe(false);
	});
	it("does not issue a second overlapping logout", async () => {
		const app = useAppStore(); app.setCurrentAdmin(admin);
		const request = pending(); vi.mocked(api.delete).mockReturnValueOnce(request.promise as any);
		const first = app.logout(); await expect(app.logout()).resolves.toBe(false);
		request.resolve({}); await first; expect(api.delete).toHaveBeenCalledOnce();
	});
	it("invalidates pending directory reads when tutor access changes", () => {
		const app = useAppStore(); app.setCurrentTutor({ _id: "t1", name: "Tutor", status: "active" });
		const revision = app.sessionRevision; app.setCurrentTutor({ _id: "t1", name: "Tutor", status: "suspended" });
		expect(app.sessionRevision).toBeGreaterThan(revision); expect(app.currentTutor?.status).toBe("suspended");
	});
});
