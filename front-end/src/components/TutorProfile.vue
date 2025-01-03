<template>
	<section class="Signup text-center">
		<!-- Tutor's Profile -->
		<h2>Profile</h2>
		<div v-if="currentTutor" :key="currentTutor._id" class="tutorList mt-2">
			<br />
			<ul>
				<li><h4>Tutor</h4></li>

				<!-- Editable fields -->
				<li v-show="currentTutor.editTutors">
					<label>
						Name:&emsp;
						<input v-model="currentTutor.name" class="editTutor" type="text" />
					</label>
				</li>
				<li v-show="currentTutor.editTutors">
					<label>
						Email:&emsp;
						<input v-model="currentTutor.email" class="editTutor" type="text" />
					</label>
				</li>
				<li v-show="currentTutor.editTutors">
					<label>
						Age:&emsp;
						<input v-model="currentTutor.age" class="editTutor" type="text" />
					</label>
				</li>
				<li v-show="currentTutor.editTutors">
					<label>
						State:&emsp;
						<input v-model="currentTutor.state" class="editTutor" type="text" />
					</label>
				</li>

				<!-- Display fields -->
				<li v-show="!currentTutor.editTutors">
					<label class="hidden">Name:</label>&emsp;<p>{{ currentTutor.name }}</p>
				</li>
				<li v-show="!currentTutor.editTutors">
					<label class="hidden">Email:</label>&emsp;<p>{{ currentTutor.email }}</p>
				</li>
				<li v-show="!currentTutor.editTutors">
					<label class="hidden">Age:</label>&emsp;<p>{{ currentTutor.age }}</p>
				</li>
				<li v-show="!currentTutor.editTutors">
					<label class="hidden">State:</label>&emsp;<p>{{ currentTutor.state }}</p>
				</li>
			</ul>
			<br />
			<button @click="deleteCurrentTutor()">Delete</button>
			<button :string="currentTutor.saveEdit" @click="editCurrentTutor()">
				{{ currentTutor.saveEdit }}
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
import { defineComponent, onMounted, ref, computed } from "vue";
import { useStore } from "vuex";
import axios from "axios";

export default defineComponent({
	name: "TutorProfile",
	setup() {
		const store = useStore();
		const error = ref<string>("");

		// Computed from store
		const currentTutor = computed(() => store.state.currentTutor);
		const users = computed(() => store.state.users);

		// Lifecycle
		onMounted(async () => {
			await getUsers();
		});

		// Methods
		const getUsers = async () => {
			try {
				if (!currentTutor.value) return;
				// Example endpoint: /api/users/oftutor/:tutorId
				const response = await axios.get(
					`/api/users/oftutor/${currentTutor.value._id}`
				);
				store.commit("setUsers", response.data);
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const editUser = async (user: any) => {
			try {
				await axios.put(`/api/users/tutor/${user._id}`, {
					name: user.name,
					email: user.email,
					age: user.age,
					state: user.state,
					editUsers: !user.editUsers,
					saveEdit: user.editUsers ? "Edit" : "Save",
				});
				await getUsers();
				error.value = "";
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const deleteUser = async (user: any) => {
			try {
				await axios.delete(`/api/users/tutor/${user._id}`);
				await getUsers();
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const editCurrentTutor = async () => {
			if (!currentTutor.value) return;
			try {
				await axios.post(`/api/accounts/changeEmail/${currentTutor.value._id}`, {
					email: currentTutor.value.email,
				});

				await axios.put(`/api/tutors/${currentTutor.value._id}`, {
					name: currentTutor.value.name,
					email: currentTutor.value.email,
					age: currentTutor.value.age,
					state: currentTutor.value.state,
					editTutors: !currentTutor.value.editTutors,
					saveEdit: currentTutor.value.editTutors ? "Edit" : "Save",
				});
				await refreshTutor();
				error.value = "";
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const deleteCurrentTutor = async () => {
			if (!currentTutor.value) return;
			try {
				await axios.delete(`/api/tutors/remove/${currentTutor.value._id}`);
				// Optionally remove from store
				store.commit("setCurrentTutor", null);
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const refreshTutor = async () => {
			try {
				const response = await axios.get("/api/tutors/loggedin");
				store.commit("setCurrentTutor", response.data.currentTutor);
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		return {
			error,
			currentTutor,
			users,
			getUsers,
			editUser,
			deleteUser,
			editCurrentTutor,
			deleteCurrentTutor,
			refreshTutor,
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
