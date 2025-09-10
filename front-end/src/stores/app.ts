// src/stores/app.ts
import { defineStore } from "pinia";
import { api } from "@/api";

/* ------------------------------------------------------------------ */
/*  TypeScript interfaces                                             */
/* ------------------------------------------------------------------ */
export interface Tutor {
	_id: string;
	name: string;
	email: string;
	age: number;
	state: string;
	usersOfTutorLength: number;
	editTutors: boolean;
	saveEdit: string;
}

export interface User {
	_id: string;
	name: string;
	email: string;
	age: number;
	state: string;
	editUsers: boolean;
	saveEdit: string;
}

export interface Admin {
	_id: string;
	name: string;
	email: string;
	editAdmins: boolean;
	saveEdit: string;
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
		isLoggedIn: state =>
			!!state.currentUser || !!state.currentTutor || !!state.currentAdmin
	},

	actions: {
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

		async getUsersOfTutor() {
			if (!this.currentTutor) return;
			try {
				const { data } = await api.get<User[]>(
					`/users/oftutor/${this.currentTutor._id}`
				);
				this.setUsers(data);
			} catch (e) {
				console.error(e);
			}
		},

		/* ---------- session helpers ---------- */
		async logout() {
			try {
				await api.delete("/accounts/logout"); // one endpoint for all roles
				this.setCurrentTutor(null);
				this.setCurrentUser(null);
				this.setCurrentAdmin(null);
				this.setError(null);
			} catch (e: any) {
				this.setError(e.message);
			}
		},

		async refreshCurrentUser() {
			try {
				const { data } = await api.get<{ currentUser: User }>(
					"/users/loggedin"
				);
				this.setCurrentUser(data.currentUser);
			} catch {
				this.setCurrentUser(null);
			}
		},

		async refreshCurrentTutor() {
			try {
				const { data } = await api.get<{ currentTutor: Tutor }>(
					"/tutors/loggedin"
				);
				this.setCurrentTutor(data.currentTutor);
			} catch {
				this.setCurrentTutor(null);
			}
		},

		async refreshCurrentAdmin() {
			try {
				const { data } = await api.get<{ currentAdmin: Admin }>(
					"/admins/loggedin"
				);
				this.setCurrentAdmin(data.currentAdmin);
			} catch {
				this.setCurrentAdmin(null);
			}
		}
	}
});
