<template>
	<section class="Signup text-center">
		<!-- ------------------  Admin  ------------------ -->
		<h2>Profile</h2>

		<div v-if="currentAdmin" :key="currentAdmin._id" class="tutorList mt-2">
			<br />
			<ul>
				<li><h4>Admin</h4></li>

				<!-- Editable fields -->
				<li v-if="currentAdmin.editAdmins">
					<label>Name:&emsp;
						<input v-model="currentAdmin.name" class="editTutor" type="text" />
					</label>
				</li>
				<li v-if="currentAdmin.editAdmins">
					<label>Email:&emsp;
						<input v-model="currentAdmin.email" class="editTutor" type="text" />
					</label>
				</li>

				<!-- Display fields -->
				<li v-else>
					<label class="hidden">Name:</label>&emsp;<p>{{ currentAdmin.name }}</p>
				</li>
				<li v-else>
					<label class="hidden">Email:</label>&emsp;<p>{{ currentAdmin.email }}</p>
				</li>
			</ul>
			<br />

			<button @click="deleteAdmin">Delete</button>
			<button @click="editAdmin">{{ currentAdmin.saveEdit }}</button>
		</div>

		<hr />

		<!-- ------------------  Tutors  ------------------ -->
		<h2>Tutors</h2>

		<div v-for="tutor in tutors" :key="tutor._id" class="tutorList mt-2">
			<br />
			<ul>
				<li><h4>Tutor</h4></li>

				<!-- Editable -->
				<template v-if="tutor.editTutors">
					<li><label>Name:&emsp;<input v-model="tutor.name"  class="editTutor" type="text" /></label></li>
					<li><label>Email:&emsp;<input v-model="tutor.email" class="editTutor" type="text" /></label></li>
					<li><label>Age:&emsp;<input v-model="tutor.age"   class="editTutor" type="text" /></label></li>
					<li><label>State:&emsp;<input v-model="tutor.state" class="editTutor" type="text" /></label></li>
				</template>

				<!-- Display -->
				<template v-else>
					<li><label class="hidden">Name:</label>&emsp;<p>{{ tutor.name }}</p></li>
					<li><label class="hidden">Email:</label>&emsp;<p>{{ tutor.email }}</p></li>
					<li><label class="hidden">Age:</label>&emsp;<p>{{ tutor.age }}</p></li>
					<li><label class="hidden">State:</label>&emsp;<p>{{ tutor.state }}</p></li>
				</template>
			</ul>
			<br />

			<button @click="deleteTutor(tutor)">Delete</button>
			<button @click="editTutor(tutor)">{{ tutor.saveEdit }}</button>
		</div>

		<hr />

		<!-- ------------------  Users  ------------------ -->
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

interface Admin {
	_id: string;
	name: string;
	email: string;
	editAdmins: boolean;
	saveEdit: string;
}

/* ------------------------------------------------------------------ */
/*  Imports                                                           */
/* ------------------------------------------------------------------ */
import { ref, onMounted, computed } from "vue";
import { useStore } from "vuex";
import axios from "axios";

/* ------------------------------------------------------------------ */
/*  Reactive state from Vuex                                          */
/* ------------------------------------------------------------------ */
const store  = useStore();

const currentAdmin = computed<Admin | null>(() => store.state.currentAdmin);
const tutors       = computed<Tutor[]>(() => store.state.tutors);
const users        = computed<User[]>(() => store.state.users);

/* ------------------------------------------------------------------ */
/*  Local state                                                       */
/* ------------------------------------------------------------------ */
const error = ref<string>("");

/* ------------------------------------------------------------------ */
/*  API helpers                                                       */
/* ------------------------------------------------------------------ */
const getTutors = async () => {
	const { data } = await axios.get<Tutor[]>("/api/tutors");
	store.commit("setTutors", data);
};

const getUsers = async () => {
	const { data } = await axios.get<User[]>("/api/users/all");
	store.commit("setUsers", data);
};

/* ------------------------------------------------------------------ */
/*  CRUD actions                                                      */
/* ------------------------------------------------------------------ */
const editUser = async (user: User) => {
	try {
		await axios.put(`/api/admins/user/${user._id}`, {
			...user,
			editUsers: !user.editUsers,
			saveEdit : user.editUsers ? "Edit" : "Save"
		});
		await Promise.all([getTutors(), getUsers()]);
	} catch (e: any) {
		error.value = "Error: " + e.response?.data?.message;
	}
};

const deleteUser = async (user: User) => {
	try {
		await axios.delete(`/api/admins/user/${user._id}`);
		await getUsers();
	} catch (e: any) {
		error.value = "Error: " + e.response?.data?.message;
	}
};

const editTutor = async (tutor: Tutor) => {
	try {
		await axios.put(`/api/admins/tutor/${tutor._id}`, {
			...tutor,
			editTutors: !tutor.editTutors,
			saveEdit   : tutor.editTutors ? "Edit" : "Save"
		});
		await Promise.all([getTutors(), getUsers()]);
	} catch (e: any) {
		error.value = "Error: " + e.response?.data?.message;
	}
};

const deleteTutor = async (tutor: Tutor) => {
	try {
		await axios.delete(`/api/admins/tutor/${tutor._id}`);
		await getUsers();
	} catch (e: any) {
		error.value = "Error: " + e.response?.data?.message;
	}
};

const editAdmin = async () => {
	if (!currentAdmin.value) return;

	try {
		// (1) change email if needed
		await axios.post(`/api/accounts/changeEmail/${currentAdmin.value._id}`, {
			email: currentAdmin.value.email
		});

		// (2) toggle edit mode
		await axios.put(`/api/admins/${currentAdmin.value._id}`, {
			name       : currentAdmin.value.name,
			email      : currentAdmin.value.email,
			editAdmins : !currentAdmin.value.editAdmins,
			saveEdit   : currentAdmin.value.editAdmins ? "Edit" : "Save"
		});

		await refreshAdmin();
	} catch (e: any) {
		error.value = "Error: " + e.response?.data?.message;
	}
};

const deleteAdmin = async () => {
	if (!currentAdmin.value) return;
	try {
		await axios.delete(`/api/admins/remove/${currentAdmin.value._id}`);
		store.commit("setCurrentAdmin", null);
	} catch (e: any) {
		error.value = "Error: " + e.response?.data?.message;
	}
};

const refreshAdmin = async () => {
	const { data } = await axios.get<{ currentAdmin: Admin }>("/api/admins/loggedin");
	store.commit("setCurrentAdmin", data.currentAdmin);
};

/* ------------------------------------------------------------------ */
/*  Lifecycle                                                         */
/* ------------------------------------------------------------------ */
onMounted(async () => {
	try {
		await Promise.all([getTutors(), getUsers()]);
		await refreshAdmin();
	} catch (e: any) {
		error.value = "Error: " + e.response?.data?.message;
	}
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
