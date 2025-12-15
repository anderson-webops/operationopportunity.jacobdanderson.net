import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { useUserStore } from "../src/stores/user";

describe("user store", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it("tracks name history and exposes otherNames", () => {
		const store = useUserStore();
		store.setNewName("First");
		store.setNewName("Second");

		expect(store.savedName).toBe("Second");
		expect(store.otherNames).toContain("First");
		expect(store.otherNames).not.toContain("Second");
	});
});
