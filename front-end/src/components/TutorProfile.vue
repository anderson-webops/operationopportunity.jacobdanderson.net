<template>
	<section class="Signup text-center">
		<!-- ---------------- Tutor profile ---------------- -->
		<h2>Profile</h2>

		<div v-if="currentTutor" :key="currentTutor._id" class="tutorList mt-2">
			<br />
			<ul>
				<li><h4>Tutor</h4></li>

				<!-- Editable -->
				<template v-if="currentTutor.editTutors">
					<li>
						<label>Name:&emsp;
							<input v-model="currentTutor.name"  class="editTutor" type="text" />
						</label>
					</li>
					<li>
						<label>Email:&emsp;
							<input v-model="currentTutor.email" class="editTutor" type="text" />
						</label>
					</li>
					<li>
						<label>Age:&emsp;
							<input v-model="currentTutor.age"   class="editTutor" type="text" />
						</label>
					</li>
					<li>
						<label>State:&emsp;
							<input v-model="currentTutor.state" class="editTutor" type="text" />
						</label>
					</li>
				</template>

				<!-- Display -->
				<template v-else>
					<li><label class="hidden">Name:</label>&emsp;<p>{{ currentTutor.name }}</p></li>
					<li><label class="hidden">Email:</label>&emsp;<p>{{ currentTutor.email }}</p></li>
					<li><label class="hidden">Age:</label>&emsp;<p>{{ currentTutor.age }}</p></li>
					<li><label class="hidden">State:</label>&emsp;<p>{{ currentTutor.state }}</p></li>
				</template>
			</ul>
			<br />

			<button @click="deleteCurrentTutor">Delete</button>
			<button @click="editCurrentTutor">{{ currentTutor.saveEdit }}</button>
		</div>

		<hr />

		<!-- ---------------- Users list ---------------- -->
		<h2>Users</h2>

		<div v-for="user in users" :key="user._id" class="tutorList mt-2">
			<br />
			<ul>
				<!-- Editable -->
				<template v-if="user.editUsers">
					<li><label>Name:&emsp;<input v-model="user.name"  class="editTutor" type="text" /></label></li>
					<li><label>Email:&emsp;<input v-model="user.email" class="editTutor" type="text" /></label></li>
					<li><label>Age:&emsp;<input v-model="user.age"   class="editTutor" type="text" /></label></li>
					<li><label>State:&emsp;<input v-model="user.state" class="editTutor" type="text" /></label></li>
				</template>

				<!-- Display -->
				<template v-else>
					<li><label class="hidden">Name:</label>&emsp;<p>{{ user.name }}</p></li>
					<li><label class="hidden">Email:</label>&emsp;<p>{{ user.email }}</p></li>
					<li><label class="hidden">Age:</label>&emsp;<p>{{ user.age }}</p></li>
					<li><label class="hidden">State:</label>&emsp;<p>{{ user.state }}</p></li>
				</template>
			</ul>
			<br />

			<button @click="deleteUser(user)">Delete</button>
			<button @click="editUser(user)">{{ user.saveEdit }}</button>
		</div>

		<p v-if="error" class="error">{{ error }}</p>
	</section>
</template>

<script setup lang="ts">
/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
interface User {
	_id: string;
	name: string;
	email: string;
	age: string;
	state: string;
	editUsers: boolean;
	saveEdit: string;
}

interface Tutor {
	_id: string;
	name: string;
	email: string;
	age: string;
	state: string;
	editTutors: boolean;
	saveEdit: string;
}

/* ------------------------------------------------------------------ */
/*  Imports / store refs                                              */
/* ------------------------------------------------------------------ */
import { ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import axios from "axios";

const store          = useStore();
const currentTutor   = computed<Tutor | null>(() => store.state.currentTutor);
const users          = computed<User[]>(() => store.state.users);
const error          = ref<string>("");

/* ------------------------------------------------------------------ */
/*  API helpers                                                       */
/* ------------------------------------------------------------------ */
const getUsers = async () => {
	if (!currentTutor.value) return;
	const { data } = await axios.get<User[]>(`/api/users/oftutor/${currentTutor.value._id}`);
	store.commit("setUsers", data);
};

const refreshTutor = async () => {
	const { data } = await axios.get<{ currentTutor: Tutor }>("/api/tutors/loggedin");
	store.commit("setCurrentTutor", data.currentTutor);
};

/* ------------------------------------------------------------------ */
/*  CRUD actions                                                      */
/* ------------------------------------------------------------------ */
const editUser = async (user: User) => {
	try {
		await axios.put(`/api/users/tutor/${user._id}`, {
			...user,
			editUsers: !user.editUsers,
			saveEdit : user.editUsers ? "Edit" : "Save"
		});
		await getUsers();
	} catch (e: any) {
		error.value = "Error: " + e.response?.data?.message;
	}
};

const deleteUser = async (user: User) => {
	try {
		await axios.delete(`/api/users/tutor/${user._id}`);
		await getUsers();
	} catch (e: any) {
		error.value = "Error: " + e.response?.data?.message;
	}
};

const editCurrentTutor = async () => {
	if (!currentTutor.value) return;
	try {
		/** 1) sync email across account collection */
		await axios.post(`/api/accounts/changeEmail/${currentTutor.value._id}`, {
			email: currentTutor.value.email
		});

		/** 2) toggle tutor edit mode */
		await axios.put(`/api/tutors/${currentTutor.value._id}`, {
			...currentTutor.value,
			editTutors: !currentTutor.value.editTutors,
			saveEdit  : currentTutor.value.editTutors ? "Edit" : "Save"
		});

		await refreshTutor();
	} catch (e: any) {
		error.value = "Error: " + e.response?.data?.message;
	}
};

const deleteCurrentTutor = async () => {
	if (!currentTutor.value) return;
	try {
		await axios.delete(`/api/tutors/remove/${currentTutor.value._id}`);
		store.commit("setCurrentTutor", null);
	} catch (e: any) {
		error.value = "Error: " + e.response?.data?.message;
	}
};

/* ------------------------------------------------------------------ */
/*  Lifecycle                                                         */
/* ------------------------------------------------------------------ */
onMounted(() => {
	getUsers().catch(() => {/* handled above */});
});
</script>

<style scoped>
ul { display: flex; flex-flow: column; }
ul p { display: inline; }
div.tutorList, li { align-self: center; }
.hidden { display: none; }
div.tutorList {
	outline: black solid 1px;
	padding-bottom: 1%;
	width: 35%;
	margin: auto;
}
@media only screen and (min-width: 1px) and (max-width: 960px) {
	div.tutorList { width: 50%; }
}
.error { color: red; margin-top: 10px; }
</style>
