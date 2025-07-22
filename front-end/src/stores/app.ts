// src/stores/app.ts
import { defineStore } from "pinia";
import axios from "axios";

/* ---------------------------------------------
   Re-use your existing TS interfaces here
--------------------------------------------- */
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
	_id:        string;
	name:       string;
	email:      string;
	editAdmins: boolean;
	saveEdit:   string;
}

/* ---------------------------------------------
   Pinia store definition
--------------------------------------------- */
export const useAppStore = defineStore("app", {
	state: () => ({
		/* mirrors your Vuex `state` */
		users:          [] as User[],
		tutors:         [] as Tutor[],
		admins:         [] as Admin[],

		currentUser:    null as User   | null,
		currentTutor:   null as Tutor  | null,
		currentAdmin:   null as Admin  | null,

		loginBlock:     false,
		signupBlock:    false,
		showUsers:      false,

		error:          null as string | null,
	}),

	getters: {
		/* mirrors your Vuex `getters` */
		isLoggedIn: (state) =>
			!!state.currentUser || !!state.currentTutor || !!state.currentAdmin,
	},

	actions: {
		/* mirrors your Vuex `mutations` */
		setUsers(u: User[]      ) { this.users        = u; },
		setTutors(t: Tutor[]    ) { this.tutors       = t; },
		setAdmins(a: Admin[]    ) { this.admins       = a; },
		setCurrentUser(u: User | null)  { this.currentUser  = u; },
		setCurrentTutor(t: Tutor| null) { this.currentTutor = t; },
		setCurrentAdmin(a: Admin| null) { this.currentAdmin = a; },
		setLoginBlock(v: boolean)       { this.loginBlock   = v; },
		setSignupBlock(v: boolean)      { this.signupBlock  = v; },
		setShowUsers(v: boolean)        { this.showUsers    = v; },
		setError(e: string | null)      { this.error        = e; },

		/* mirrors your Vuex `actions` */
		async fetchUsers() {
			try {
				const { data } = await axios.get<User[]>("/api/users");
				this.setUsers(data);
			} catch (e) { console.error(e); }
		},
		async fetchTutors() {
			try {
				const { data } = await axios.get<Tutor[]>("/api/tutors");
				this.setTutors(data);
			} catch (e) { console.error(e); }
		},

		async getUsersOfTutor() {
			if (!this.currentTutor) return;
			try {
				const { data } = await axios.get<User[]>(
					`/api/users/oftutor/${this.currentTutor._id}`
				);
				this.setUsers(data);
			} catch (e) { console.error(e); }
		},

		async logout() {
			try {
				if (this.currentTutor)  await axios.delete("/api/tutors/logout");
				if (this.currentUser)   await axios.delete("/api/users/logout");
				if (this.currentAdmin)  await axios.delete("/api/admins/logout");
				this.setCurrentTutor(null);
				this.setCurrentUser(null);
				this.setCurrentAdmin(null);
				this.setError(null);
			} catch (e: any) {
				this.setError(e.message);
			}
		},

		/* convenience methods to re-load "logged in" after refresh */
		async refreshCurrentUser() {
			try {
				const { data } = await axios.get<{ currentUser: User }>(
					"/api/users/loggedin"
				);
				this.setCurrentUser(data.currentUser);
			} catch {
				this.setCurrentUser(null);
			}
		},
		async refreshCurrentTutor() {
			try {
				const { data } = await axios.get<{ currentTutor: Tutor }>(
					"/api/tutors/loggedin"
				);
				this.setCurrentTutor(data.currentTutor);
			} catch {
				this.setCurrentTutor(null);
			}
		},
		async refreshCurrentAdmin() {
			try {
				const { data } = await axios.get<{ currentAdmin: Admin }>(
					"/api/admins/loggedin"
				);
				this.setCurrentAdmin(data.currentAdmin);
			} catch {
				this.setCurrentAdmin(null);
			}
		},
	},
});
