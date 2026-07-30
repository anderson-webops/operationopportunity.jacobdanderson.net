// src/stores/app.ts
import { defineStore } from "pinia";
import { api, clearCsrfToken } from "@/api";

/* ------------------------------------------------------------------ */
/*  TypeScript interfaces                                             */
/* ------------------------------------------------------------------ */
export interface Tutor {
	_id: string;
	name: string;
	email?: string;
	age?: number;
	state?: string;
	status?: "pending" | "active" | "suspended";
}

export interface User {
	_id: string;
	name: string;
	email: string;
	age: number;
	state: string;
	tutor?: string | null;
}

export interface Admin {
	_id: string;
	name: string;
	email: string;
	editAdmins: boolean;
}

/* ------------------------------------------------------------------ */
/*  Pinia store                                                       */
/* ------------------------------------------------------------------ */
export const useAppStore = defineStore("app", {
	state: () => ({
		users: [] as User[],
		tutors: [] as Tutor[],
		admins: [] as Admin[],

		currentUser: null as User | null,
		currentTutor: null as Tutor | null,
		currentAdmin: null as Admin | null,

		loginBlock: false,
		signupBlock: false,
		showUsers: false,

		error: null as string | null
	}),

	getters: {
		isLoggedIn: (state) => !!state.currentUser || !!state.currentTutor || !!state.currentAdmin
	},

	actions: {
		/*		async bootstrapSession() {
			await Promise.allSettled([
				this.refreshCurrentAdmin(),
				this.refreshCurrentTutor(),
				this.refreshCurrentUser()
			]);
		}, */
		async bootstrapSession() {
			try {
				const { data } = await api.get("/accounts/me");
				if (data.adminID) {
					await this.refreshCurrentAdmin();
					this.setCurrentTutor(null);
					this.setCurrentUser(null);
				} else if (data.tutorID) {
					await this.refreshCurrentTutor();
					this.setCurrentAdmin(null);
					this.setCurrentUser(null);
				} else if (data.userID) {
					await this.refreshCurrentUser();
					this.setCurrentAdmin(null);
					this.setCurrentTutor(null);
				} else {
					this.setCurrentAdmin(null);
					this.setCurrentTutor(null);
					this.setCurrentUser(null);
				}
			} catch {
				this.setCurrentAdmin(null);
				this.setCurrentTutor(null);
				this.setCurrentUser(null);
			}
		},

		/* ---------- setters ---------- */
		setUsers(u: User[]) {
			this.users = u;
		},
		setTutors(t: Tutor[]) {
			this.tutors = t;
		},
		setAdmins(a: Admin[]) {
			this.admins = a;
		},
		setCurrentUser(u: User | null) {
			this.currentUser = u;
		},
		setCurrentTutor(t: Tutor | null) {
			this.currentTutor = t;
		},
		setCurrentAdmin(a: Admin | null) {
			this.currentAdmin = a;
		},
		setLoginBlock(v: boolean) {
			this.loginBlock = v;
		},
		setSignupBlock(v: boolean) {
			this.signupBlock = v;
		},
		setShowUsers(v: boolean) {
			this.showUsers = v;
		},
		setError(e: string | null) {
			this.error = e;
		},
		clearSession() {
			this.setCurrentTutor(null);
			this.setCurrentUser(null);
			this.setCurrentAdmin(null);
			this.setError(null);
		},

		/* ---------- data fetchers ---------- */
		async fetchUsers() {
			try {
				const { data } = await api.get<User[]>("/users/all");
				this.setUsers(data);
			} catch (e) {
				console.error(e);
			}
		},

		async fetchTutors() {
			try {
				const { data } = await api.get<Tutor[]>("/tutors");
				this.setTutors(data);
			} catch (e) {
				console.error(e);
			}
		},

		async fetchAllTutors() {
			try {
				const { data } = await api.get<Tutor[]>("/tutors/all");
				this.setTutors(data);
			} catch (e) {
				console.error(e);
			}
		},

		async fetchAdmins() {
			try {
				const { data } = await api.get<Admin[]>("/admins");
				this.setAdmins(data);
			} catch (e) {
				console.error(e);
			}
		},

		async getUsersOfTutor() {
			if (!this.currentTutor) return;
			try {
				const { data } = await api.get<User[]>(`/users/oftutor/${this.currentTutor._id}`);
				this.setUsers(data);
			} catch (e) {
				console.error(e);
			}
		},

		/* ---------- session helpers ---------- */
		async logout() {
			this.setError(null);
			try {
				await api.delete("/accounts/logout"); // one endpoint for all roles
				clearCsrfToken();
				this.clearSession();
				return true;
			} catch (e: any) {
				if (e.response?.status === 401) {
					clearCsrfToken();
					this.clearSession();
					return true;
				}
				this.setError(
					e.response?.data?.message ??
						"Sign out could not be confirmed. Your session remains active; please try again."
				);
				return false;
			}
		},

		async refreshCurrentUser() {
			try {
				const { data } = await api.get<{ currentUser: User }>("/users/loggedin");
				this.setCurrentUser(data.currentUser);
			} catch {
				this.setCurrentUser(null);
			}
		},

		async refreshCurrentTutor() {
			try {
				const { data } = await api.get<{ currentTutor: Tutor }>("/tutors/loggedin");
				this.setCurrentTutor(data.currentTutor);
			} catch {
				this.setCurrentTutor(null);
			}
		},

		async refreshCurrentAdmin() {
			try {
				const { data } = await api.get<{ currentAdmin: Admin }>("/admins/loggedin");
				this.setCurrentAdmin(data.currentAdmin);
			} catch {
				this.setCurrentAdmin(null);
			}
		}
	}
});
