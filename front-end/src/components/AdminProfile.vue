<template>
	<section class="Signup text-center">
		<!-- Admin's Profile -->
		<h2>Profile</h2>
		<div v-if="currentAdmin" :key="currentAdmin._id" class="tutorList mt-2">
			<br />
			<ul>
				<li><h4>Admin</h4></li>

				<!-- Editable fields -->
				<li v-show="currentAdmin.editAdmins">
					<label>
						Name:&emsp;
						<input v-model="currentAdmin.name" class="editTutor" type="text" />
					</label>
				</li>
				<li v-show="currentAdmin.editAdmins">
					<label>
						Email:&emsp;
						<input v-model="currentAdmin.email" class="editTutor" type="text" />
					</label>
				</li>

				<!--          <li v-show="currentAdmin.editAdmins"><label>Age:&emsp;<input class="editTutor" type="text" v-model="currentAdmin.age" /></label></li>-->
				<!--          <li v-show="currentAdmin.editAdmins"><label>State:&emsp;<input class="editTutor" type="text" v-model="currentAdmin.state" /></label></li>-->

				<!-- Display fields -->
				<li v-show="!currentAdmin.editAdmins">
					<label class="hidden">Name:</label>&emsp;<p>{{ currentAdmin.name }}</p>
				</li>
				<li v-show="!currentAdmin.editAdmins">
					<label class="hidden">Email:</label>&emsp;<p>{{ currentAdmin.email }}</p>
				</li>

				<!--          <li v-show="!currentAdmin.editAdmins"><label class="hidden">Age:</label>&emsp;<p>{{ currentAdmin.age }}</p></li>-->
				<!--          <li v-show="!currentAdmin.editAdmins"><label class="hidden">State:</label>&emsp;<p>{{ currentAdmin.state }}</p></li>-->

			</ul>
			<br />
			<button @click="deleteAdmin()">Delete</button>
			<button :string="currentAdmin.saveEdit" @click="editAdmin()">
				{{ currentAdmin.saveEdit }}
			</button>
		</div>

		<hr />

		<!-- List Tutors -->
		<h2>Tutors</h2>
		<div
			v-for="tutorIt in tutors"
			:key="tutorIt._id"
			class="tutorList mt-2"
		>
			<br />
			<ul>
				<li><h4>Tutor</h4></li>

				<!-- Editable fields -->
				<li v-show="tutorIt.editTutors">
					<label>
						Name:&emsp;
						<input v-model="tutorIt.name" class="editTutor" type="text" />
					</label>
				</li>
				<li v-show="tutorIt.editTutors">
					<label>
						Email:&emsp;
						<input v-model="tutorIt.email" class="editTutor" type="text" />
					</label>
				</li>
				<li v-show="tutorIt.editTutors">
					<label>
						Age:&emsp;
						<input v-model="tutorIt.age" class="editTutor" type="text" />
					</label>
				</li>
				<li v-show="tutorIt.editTutors">
					<label>
						State:&emsp;
						<input v-model="tutorIt.state" class="editTutor" type="text" />
					</label>
				</li>

				<!-- Display fields -->
				<li v-show="!tutorIt.editTutors">
					<label class="hidden">Name:</label>&emsp;<p>{{ tutorIt.name }}</p>
				</li>
				<li v-show="!tutorIt.editTutors">
					<label class="hidden">Email:</label>&emsp;<p>{{ tutorIt.email }}</p>
				</li>
				<li v-show="!tutorIt.editTutors">
					<label class="hidden">Age:</label>&emsp;<p>{{ tutorIt.age }}</p>
				</li>
				<li v-show="!tutorIt.editTutors">
					<label class="hidden">State:</label>&emsp;<p>{{ tutorIt.state }}</p>
				</li>
			</ul>
			<br />
			<button @click="deleteTutor(tutorIt)">Delete</button>
			<button :string="tutorIt.saveEdit" @click="editTutor(tutorIt)">
				{{ tutorIt.saveEdit }}
			</button>
		</div>

		<hr />

		<!-- List Users -->
		<h2>Users</h2>
		<div
			v-for="userIt in users"
			:key="userIt._id"
			class="tutorList mt-2"
		>
			<br />
			<ul>
				<!-- Editable fields -->
				<li v-show="userIt.editUsers">
					<label>
						Name:&emsp;
						<input v-model="userIt.name" class="editTutor" type="text" />
					</label>
				</li>
				<li v-show="userIt.editUsers">
					<label>
						Email:&emsp;
						<input v-model="userIt.email" class="editTutor" type="text" />
					</label>
				</li>
				<li v-show="userIt.editUsers">
					<label>
						Age:&emsp;
						<input v-model="userIt.age" class="editTutor" type="text" />
					</label>
				</li>
				<li v-show="userIt.editUsers">
					<label>
						State:&emsp;
						<input v-model="userIt.state" class="editTutor" type="text" />
					</label>
				</li>

				<!-- Display fields -->
				<li v-show="!userIt.editUsers">
					<label class="hidden">Name:</label>&emsp;<p>{{ userIt.name }}</p>
				</li>
				<li v-show="!userIt.editUsers">
					<label class="hidden">Email:</label>&emsp;<p>{{ userIt.email }}</p>
				</li>
				<li v-show="!userIt.editUsers">
					<label class="hidden">Age:</label>&emsp;<p>{{ userIt.age }}</p>
				</li>
				<li v-show="!userIt.editUsers">
					<label class="hidden">State:</label>&emsp;<p>{{ userIt.state }}</p>
				</li>
			</ul>
			<br />
			<button @click="deleteUser(userIt)">Delete</button>
			<button :string="userIt.saveEdit" @click="editUser(userIt)">
				{{ userIt.saveEdit }}
			</button>
		</div>
		<p v-if="error" class="error">{{ error }}</p>
	</section>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from "vue";
import { useStore } from "vuex";
import axios from "axios";

export default defineComponent({
	name: "AdminProfile",
	setup() {
		const store = useStore();
		const error = ref<string>("");

		// Computed from Vuex state
		const currentAdmin = computed(() => store.state.currentAdmin);
		const tutors = computed(() => store.state.tutors);
		const users = computed(() => store.state.users);

		// Lifecycle
		onMounted(async () => {
			try {
				await getTutors();
				await getUsers();
				getCurrentAdmin();
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		});

		// Methods
		const getTutors = async () => {
			try {
				const response = await axios.get("/api/tutors");
				// commit to store
				store.commit("setTutors", response.data);
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const getUsers = async () => {
			try {
				const response = await axios.get("/api/users/all");
				store.commit("setUsers", response.data);
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const editUser = async (user: any) => {
			try {
				await axios.put(`/api/admins/user/${user._id}`, {
					name: user.name,
					email: user.email,
					age: user.age,
					state: user.state,
					editUsers: !user.editUsers,
					saveEdit: user.editUsers ? "Edit" : "Save",
				});
				// Refresh data
				await getTutors();
				await getUsers();
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const deleteUser = async (user: any) => {
			try {
				await axios.delete(`/api/admins/user/${user._id}`);
				await getUsers();
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const editTutor = async (tutor: any) => {
			try {
				await axios.put(`/api/admins/tutor/${tutor._id}`, {
					name: tutor.name,
					email: tutor.email,
					age: tutor.age,
					state: tutor.state,
					editTutors: !tutor.editTutors,
					saveEdit: tutor.editTutors ? "Edit" : "Save",
				});
				// Refresh data
				await getTutors();
				await getUsers();
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const deleteTutor = async (tutor: any) => {
			try {
				await axios.delete(`/api/admins/tutor/${tutor._id}`);
				await getUsers();
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const editAdmin = async () => {
			if (!currentAdmin.value) return;
			try {
				// First update the email
				await axios.post(`/api/accounts/changeEmail/${currentAdmin.value._id}`, {
					email: currentAdmin.value.email,
				});

				// Then update admin details
				await axios.put(`/api/admins/${currentAdmin.value._id}`, {
					name: currentAdmin.value.name,
					email: currentAdmin.value.email,
					editAdmins: !currentAdmin.value.editAdmins,
					saveEdit: currentAdmin.value.editAdmins ? "Edit" : "Save",
				});

				await refreshAdmin();
				error.value = "";
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const deleteAdmin = async () => {
			if (!currentAdmin.value) return;
			try {
				await axios.delete(`/api/admins/remove/${currentAdmin.value._id}`);
				// Optionally remove from store if needed
				store.commit("setCurrentAdmin", null);
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const refreshAdmin = async () => {
			try {
				const response = await axios.get("/api/admins/loggedin");
				store.commit("setCurrentAdmin", response.data.currentAdmin);
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const getCurrentAdmin = () => {
			// If you need to re-fetch from store, you can do so.
			// For now, just read store.state if already set.
			// e.g., store.state.currentAdmin
			// This function can remain if you want to do extra logic.
		};

		return {
			error,
			currentAdmin,
			tutors,
			users,
			// methods
			getTutors,
			getUsers,
			editUser,
			deleteUser,
			editTutor,
			deleteTutor,
			editAdmin,
			deleteAdmin,
			refreshAdmin,
			getCurrentAdmin,
		};
	},
});
</script>

<style scoped>
ul {
	display: flex;
	flex-flow: column;
}
ul p {
	display: inline;
}
div.tutorList,
li {
	align-self: center;
}
.hidden {
	display: none;
}
div.tutorList {
	outline: black solid 1px;
	padding-bottom: 1%;
	width: 35%;
	margin: auto;
}
@media only screen and (min-width: 1px) and (max-width: 960px) {
	div.tutorList {
		width: 50%;
	}
}
.error {
	color: red;
	margin-top: 10px;
}
</style>
