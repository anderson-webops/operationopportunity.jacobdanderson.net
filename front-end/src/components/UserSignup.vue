<template>
	<div>
		<h2 class="mt-5">Sign Up</h2>

		<div id="signup">
			<form id="signupForm" @submit.prevent="addUser">
				<select
					v-if="tutors.length > 0"
					id="tutorSelect"
					v-model="tutor"
					required
				>
					<option
						v-for="tutorIt in tutors"
						:key="tutorIt._id"
						:value="tutorIt"
					>
						{{ tutorIt.name }}
					</option>
				</select>
				<p v-else class="notutors">No Tutors are available</p>
				<br />

				<button id="infoSubmit" class="mt-3" type="submit">Submit</button>
			</form>

			<button
				v-show="tutors.length > 0"
				:string="showHideTutors"
				@click="showTutors = !showTutors"
			>
				{{ showHide }} tutors
			</button>

			<hr v-show="showTutors && tutors.length > 0" />

			<!-- List Tutors -->
			<h3 v-show="tutors.length > 0">
				Total Tutors: {{ tutors.length }}
			</h3>
			<h3 v-show="tutors.length > 0">
				Total Users: {{ numberOfUsers }}
			</h3>

			<div
				v-for="tutorIt in tutors"
				v-show="showTutors && tutors.length > 0"
				:key="tutorIt._id"
				class="tutorList mt-2"
			>
				<br />
				<ul>
					<!-- Display -->
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
					<li v-show="!tutorIt.editTutors">
						<label class="hidden">Users:</label>&emsp;<p>{{ tutorIt.usersOfTutorLength }}</p>
					</li>

					<!-- Edit -->
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
				</ul>
				<br />
				<button
					v-show="admin || currentTutor === tutorIt"
					@click="deleteTutor(tutorIt)"
				>
					Remove
				</button>
				<button
					v-show="admin || currentTutor === tutorIt"
					:string="tutorIt.saveEdit"
					@click="editTutor(tutorIt)"
				>
					{{ tutorIt.saveEdit }}
				</button>
				<button
					v-show="currentUser"
					:class="{ colorSelect: currentUser?.tutor?._id === tutorIt._id }"
					@click="selectTutor(tutorIt)"
				>
					Select
				</button>
			</div>
		</div>
		<p v-if="error" class="error">{{ error }}</p>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import axios from "axios";

export default defineComponent({
	name: "userSignup",
	setup() {
		const store = useStore();
		const error = ref<string>("");
		const name = ref<string>("");
		const email = ref<string>("");
		const age = ref<string>("");
		const stateField = ref<string>("");
		const tutor = ref<any>(null);
		const showTutors = ref<boolean>(false);
		const showHide = ref<string>("Show");
		const editTutors = ref<boolean>(false);
		const editUsers = ref<boolean>(false);
		const saveEdit = ref<string>("Edit");
		const numberOfUsers = ref<number>(0);

		// Computed from store
		const tutors = computed(() => store.state.tutors);
		const currentUser = computed(() => store.state.currentUser);
		const currentTutor = computed(() => store.state.currentTutor);
		const admin = computed(() => store.state.currentAdmin);

		// We manually update showHide in a watcher or computed:
		const showHideTutors = computed(() => {
			return (showHide.value = showTutors.value ? "Hide" : "Show");
		});

		onMounted(async () => {
			try {
				await getTutors();
				await getUsers(tutor.value);
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		});

		// Methods
		const addUser = async () => {
			if (!tutor.value) return;
			try {
				await axios.post(`/api/users/${tutor.value._id}`, {
					currentUser: store.state.currentUser,
				});
				await getUsers(tutor.value);
				await getNumberOfUsers();
				resetData();
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const getUsers = async (selectedTutor: any) => {
			try {
				await getNumberOfUsers();
				if (!selectedTutor) return;
				if (numberOfUsers.value !== 0) {
					const response = await axios.get(
						`/api/users/oftutor/${selectedTutor._id}`
					);
					store.commit("setUsers", response.data);
					await numberOfUsersTaughtByTutor(selectedTutor, response.data.length);
				}
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const getTutors = async () => {
			try {
				const response = await axios.get("/api/tutors");
				store.commit("setTutors", response.data);
				// default the current tutor to the first tutor
				if (response.data && response.data.length > 0) {
					tutor.value = response.data[0];
				}
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const editTutor = async (aTutor: any) => {
			if ((!admin.value && currentTutor.value !== aTutor) || !aTutor) return;
			try {
				await axios.put(`/api/tutors/${aTutor._id}`, {
					name: aTutor.name,
					email: aTutor.email,
					age: aTutor.age,
					state: aTutor.state,
					editTutors: !aTutor.editTutors,
					saveEdit: aTutor.editTutors ? "Edit" : "Save",
				});
				await getTutors();
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const numberOfUsersTaughtByTutor = async (
			aTutor: any,
			userCount: number
		) => {
			if (!aTutor) return;
			try {
				await axios.put(`/api/tutors/${aTutor._id}`, {
					name: aTutor.name,
					email: aTutor.email,
					age: aTutor.age,
					state: aTutor.state,
					usersOfTutorLength: userCount,
					editTutors: aTutor.editTutors,
					saveEdit: aTutor.saveEdit,
				});
				await getTutors();
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const deleteTutor = async (aTutor: any) => {
			if ((!admin.value && currentTutor.value !== aTutor) || !aTutor) return;
			try {
				// Refresh current list of users
				await getUsers(aTutor);

				// Delete any users under that tutor
				await axios.delete(`/api/users/under/${aTutor._id}`);
				// Then delete the tutor
				await axios.delete(`/api/tutors/remove/${aTutor._id}`);
				// Finally refresh tutors
				await getTutors();
				// And refresh any user listing if needed
				await getUsers(null);
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const getNumberOfUsers = async () => {
			try {
				const response = await axios.get("/api/users/all");
				numberOfUsers.value = response.data.length;
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
				numberOfUsers.value = 0;
			}
		};

		const selectTutor = async (aTutor: any) => {
			if (!store.state.currentUser) return;
			try {
				// Link the user to this tutor
				await axios.put(
					`/api/users/selectTutor/${store.state.currentUser._id}/${aTutor._id}`
				);
				// Refresh current user
				const response = await axios.get("/api/users/loggedin");
				store.commit("setCurrentUser", response.data.currentUser);
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const resetData = () => {
			name.value = "";
			email.value = "";
			age.value = "";
			stateField.value = "";
			tutor.value = null;
			editTutors.value = false;
			editUsers.value = false;
		};

		return {
			error,
			name,
			email,
			age,
			state: stateField,
			tutor,
			showTutors,
			showHide,
			editTutors,
			editUsers,
			saveEdit,
			numberOfUsers,
			// computed
			tutors,
			currentUser,
			currentTutor,
			admin,
			showHideTutors,
			// methods
			addUser,
			getUsers,
			getTutors,
			editTutor,
			numberOfUsersTaughtByTutor,
			deleteTutor,
			getNumberOfUsers,
			selectTutor,
			resetData,
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
.colorSelect {
	color: blue;
	background: lightblue;
}
div.tutorList {
	outline: black solid 1px;
	padding-bottom: 1%;
	width: 35%;
	margin: auto;
}
.notutors {
	text-align: center;
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
