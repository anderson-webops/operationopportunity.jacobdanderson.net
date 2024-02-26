import { createStore } from "vuex";
import axios from "axios";

const state = {
	currentUser: null,
	currentTutor: null,
	currentAdmin: null,
	users: [],
	tutors: [],
	signupBlock: false,
	loginBlock: false,
	error: ""
};

const mutations = {
	setCurrentUser(state, user) {
		state.currentUser = user;
	},
	setCurrentTutor(state, tutor) {
		state.currentTutor = tutor;
	},
	setCurrentAdmin(state, admin) {
		state.currentAdmin = admin;
	},
	setUsers(state, users) {
		state.users = users;
	},
	setTutors(state, tutors) {
		state.tutors = tutors;
	},
	setSignupBlock(state, value) {
		state.signupBlock = value;
	},
	setLoginBlock(state, value) {
		state.loginBlock = value;
	},
	setError(state, error) {
		state.error = error;
	}
};

const actions = {
	async fetchUsers({ commit }) {
		try {
			const response = await axios.get("/api/users");
			commit("setUsers", response.data);
		} catch (error) {
			commit(
				"setError",
				error instanceof Error ? error.message : "Failed to fetch users"
			);
		}
	},
	async fetchTutors({ commit }) {
		try {
			const response = await axios.get("/api/tutors");
			commit("setTutors", response.data);
		} catch (error) {
			console.error(`Error fetching tutors: ${error}`);
			commit(
				"setError",
				error instanceof Error
					? error.message
					: "An unknown error occurred while fetching tutors"
			);
		}
	},
	changeSignupView({ commit }, value) {
		commit("setSignupBlock", value);
	},
	changeLoginView({ commit }, value) {
		commit("setLoginBlock", value);
	},
	async getTutors({ commit }) {
		try {
			const response = await axios.get("/api/tutors");
			commit("setTutors", response.data);
		} catch (error) {
			console.error(`Error fetching tutors: ${error}`);
			commit(
				"setError",
				error instanceof Error
					? error.message
					: "An unknown error occurred while fetching tutors"
			);
		}
	},
	async getUsers({ commit, state }) {
		if (!state.currentTutor) return;
		try {
			const response = await axios.get(
				`/api/users/oftutor/${state.currentTutor._id}`
			);
			commit("setUsers", response.data);
		} catch (error) {
			console.error(`Error fetching users: ${error}`);
			commit(
				"setError",
				error instanceof Error
					? error.message
					: "An unknown error occurred while fetching users"
			);
		}
	},
	async logout({ commit }) {
		try {
			if (state.currentTutor) await axios.delete("/api/tutors/logout");
			if (state.currentUser) await axios.delete("/api/users/logout");
			if (state.currentAdmin) await axios.delete("/api/admins/logout");
			commit("setCurrentTutor", null);
			commit("setCurrentUser", null);
			commit("setCurrentAdmin", null);
		} catch (error) {
			console.error(`Logout failed: ${error}`);
			commit("setCurrentTutor", null);
			commit("setCurrentUser", null);
			commit("setCurrentAdmin", null);
		}
	}
};

const getters = {
	isLoggedIn: state => {
		return state.currentUser || state.currentTutor || state.currentAdmin;
	}
};

export default createStore({
	state,
	mutations,
	actions,
	getters
});
