import { createStore } from "vuex";
import axios from "axios";

interface Tutor {
	_id: string;
	name: string;
	email: string;
	age: number;
	state: string;
	usersOfTutorLength: number;
	editTutors: boolean;
	saveEdit: string;
}

interface User {
	_id: string;
	name: string;
	email: string;
	age: number;
	state: string;
	editUsers: boolean;
	saveEdit: string;
}

interface Admin {
	_id: string;
	name: string;
	email: string;
	// Add other admin properties as needed
}

interface State {
	users: User[];
	tutors: Tutor[];
	admins: Admin[];
	currentTutor: Tutor | null;
	currentUser: User | null;
	currentAdmin: Admin | null;
	loginBlock: boolean;
	signupBlock: boolean;
	showUsers: boolean;
	error: string | null;
}

const state: State = {
	users: [],
	tutors: [],
	admins: [],
	currentTutor: null,
	currentUser: null,
	currentAdmin: null,
	loginBlock: false,
	signupBlock: false,
	showUsers: false,
	error: null,
};

const mutations = {
	setUsers(state: State, users: User[]) {
		state.users = users;
	},
	setTutors(state: State, tutors: Tutor[]) {
		state.tutors = tutors;
	},
	setAdmins(state: State, admins: Admin[]) {
		state.admins = admins;
	},
	setCurrentTutor(state: State, tutor: Tutor | null) {
		state.currentTutor = tutor;
	},
	setCurrentUser(state: State, user: User | null) {
		state.currentUser = user;
	},
	setCurrentAdmin(state: State, admin: Admin | null) {
		state.currentAdmin = admin;
	},
	setSignupBlock(state: State, value: boolean) {
		state.signupBlock = value;
	},
	setLoginBlock(state: State, value: boolean) {
		state.loginBlock = value;
	},
	setError(state: State, error: string | null) {
		state.error = error;
	},
};

const actions = {
	async fetchUsers({ commit }: { commit: Function }) {
		try {
			const response = await axios.get("/api/users");
			commit("setUsers", response.data);
		} catch (error) {
			console.error(error);
		}
	},
	async fetchTutors({ commit }: { commit: Function }) {
		try {
			const response = await axios.get("/api/tutors");
			commit("setTutors", response.data);
		} catch (error) {
			console.error(error);
		}
	},
	changeSignupView({ commit }: { commit: Function }, value: boolean) {
		commit("setSignupBlock", value);
	},
	changeLoginView({ commit }: { commit: Function }, value: boolean) {
		commit("setLoginBlock", value);
	},
	async getTutors({ commit }: { commit: Function }) {
		try {
			const response = await axios.get("/api/tutors");
			commit("setTutors", response.data);
		} catch (error) {
			console.error(error);
		}
	},
	async getUsers({ commit, state }: { commit: Function; state: State }) {
		if (!state.currentTutor) return;
		try {
			const response = await axios.get(`/api/users/oftutor/${state.currentTutor._id}`);
			commit("setUsers", response.data);
		} catch (error) {
			console.error(error);
		}
	},
	async logout({ commit, state }: { commit: Function; state: State }) {
		try {
			if (state.currentTutor) await axios.delete("/api/tutors/logout");
			if (state.currentUser) await axios.delete("/api/users/logout");
			if (state.currentAdmin) await axios.delete("/api/admins/logout");
			commit("setCurrentTutor", null);
			commit("setCurrentUser", null);
			commit("setCurrentAdmin", null);
			commit("setError", null);
		} catch (error: any) {
			commit("setError", error.message);
		}
	},
};

const getters = {
	isLoggedIn: (state: State) => {
		return !!state.currentUser || !!state.currentTutor || !!state.currentAdmin;
	},
};

export default createStore({
	state,
	mutations,
	actions,
	getters,
});
