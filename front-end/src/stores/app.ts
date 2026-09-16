// src/stores/app.ts
import { defineStore } from "pinia";
import { api, resetApiSession } from "@/api";
import { confirmDestructiveAction } from "@/security/confirm";

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
		sessionRevision: 0,
		profileRevision: 0,
		sessionBusy: false,
		unsavedCount: 0,

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
		async bootstrapSession() {
			const revision = this.sessionRevision;
			try {
				const { data } = await api.get("/accounts/me");
				if (revision !== this.sessionRevision) return;
				if (data.adminID) await this.refreshCurrentAdmin();
				else if (data.tutorID) await this.refreshCurrentTutor();
				else if (data.userID) await this.refreshCurrentUser();
				else this.clearSession();
			} catch (error) {
				this.handleSessionReadFailure(error, revision);
			}
		},
		handleSessionReadFailure(error: any, revision: number) {
			if (revision !== this.sessionRevision || error?.code === "ERR_CANCELED") return;
			if ([401, 403].includes(error?.response?.status)) {
				this.clearSession();
			} else {
				this.error =
					"Account refresh is temporarily unavailable. Your current work has been kept; please retry.";
			}
		},
		invalidateSessionReads() {
			this.sessionRevision++;
			resetApiSession();
		},

		/* ---------- setters ---------- */
		setCurrentUser(u: User | null) {
			if (u && (this.currentUser?._id !== u._id || this.currentTutor || this.currentAdmin)) this.clearSession();
			if (!u && this.currentUser) this.clearSession();
			this.profileRevision++;
			this.currentUser = u;
		},
		setCurrentTutor(t: Tutor | null) {
			if (t && (this.currentTutor?._id !== t._id || this.currentUser || this.currentAdmin)) this.clearSession();
			else if (t && this.currentTutor?.status !== t.status) this.invalidateSessionReads();
			if (!t && this.currentTutor) this.clearSession();
			this.profileRevision++;
			this.currentTutor = t;
		},
		setCurrentAdmin(a: Admin | null) {
			if (a && (this.currentAdmin?._id !== a._id || this.currentTutor || this.currentUser)) this.clearSession();
			else if (a && this.currentAdmin?.editAdmins !== a.editAdmins) this.invalidateSessionReads();
			if (!a && this.currentAdmin) this.clearSession();
			this.profileRevision++;
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
			this.invalidateSessionReads();
			this.profileRevision++;
			this.currentTutor = null;
			this.currentUser = null;
			this.currentAdmin = null;
			this.error = null;
		},

		/* ---------- session helpers ---------- */
		async logout() {
			if (this.sessionBusy) return false;
			if (
				this.unsavedCount > 0 &&
				!confirmDestructiveAction("Sign out and discard changes that have not been saved?")
			) {
				return false;
			}
			this.sessionBusy = true;
			const revision = this.sessionRevision;
			this.setError(null);
			try {
				await api.delete("/accounts/logout"); // one endpoint for all roles
				if (revision !== this.sessionRevision) return false;
				this.clearSession();
				return true;
			} catch (e: any) {
				if (e.response?.status === 401) {
					if (revision !== this.sessionRevision) return false;
					this.clearSession();
					return true;
				}
				this.setError(
					e.response?.data?.message ??
						"Sign out could not be confirmed. Your session remains active; please try again."
				);
				return false;
			} finally {
				this.sessionBusy = false;
			}
		},

		async refreshCurrentUser() {
			const revision = this.sessionRevision;
			const profileRevision = this.profileRevision;
			try {
				const { data } = await api.get<{ currentUser: User }>("/users/loggedin");
				if (revision === this.sessionRevision && profileRevision === this.profileRevision)
					this.setCurrentUser(data.currentUser);
			} catch (error) {
				this.handleSessionReadFailure(error, revision);
			}
		},

		async refreshCurrentTutor() {
			const revision = this.sessionRevision;
			const profileRevision = this.profileRevision;
			try {
				const { data } = await api.get<{ currentTutor: Tutor }>("/tutors/loggedin");
				if (revision === this.sessionRevision && profileRevision === this.profileRevision)
					this.setCurrentTutor(data.currentTutor);
			} catch (error) {
				this.handleSessionReadFailure(error, revision);
			}
		},

		async refreshCurrentAdmin() {
			const revision = this.sessionRevision;
			const profileRevision = this.profileRevision;
			try {
				const { data } = await api.get<{ currentAdmin: Admin }>("/admins/loggedin");
				if (revision === this.sessionRevision && profileRevision === this.profileRevision)
					this.setCurrentAdmin(data.currentAdmin);
			} catch (error) {
				this.handleSessionReadFailure(error, revision);
			}
		}
	}
});
