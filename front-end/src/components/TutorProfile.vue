<template>
	<section class="Signup text-center">
		<h2>Profile</h2>

		<div v-if="currentTutor" :key="currentTutor._id" class="tutorList mt-2">
			<br />
			<ul>
				<li><h4>Tutor</h4></li>

				<!-- Editable -->
				<template v-if="currentTutor.editTutors">
					<li>
						<label>
							Name:&emsp;
							<input v-model="currentTutor.name" class="editTutor" type="text" />
						</label>
					</li>
					<li>
						<label>
							Email:&emsp;
							<input v-model="currentTutor.email" class="editTutor" type="text" />
						</label>
					</li>
					<li>
						<label>
							Age:&emsp;
							<input v-model="currentTutor.age" class="editTutor" type="text" />
						</label>
					</li>
					<li>
						<label>
							State:&emsp;
							<input v-model="currentTutor.state" class="editTutor" type="text" />
						</label>
					</li>
				</template>

				<!-- Display -->
				<template v-else>
					<li>
						<label class="hidden">Name:</label>&emsp;
						<p>{{ currentTutor.name }}</p>
					</li>
					<li>
						<label class="hidden">Email:</label>&emsp;
						<p>{{ currentTutor.email }}</p>
					</li>
					<li>
						<label class="hidden">Age:</label>&emsp;
						<p>{{ currentTutor.age }}</p>
					</li>
					<li>
						<label class="hidden">State:</label>&emsp;
						<p>{{ currentTutor.state }}</p>
					</li>
				</template>
			</ul>
			<br />

			<button @click="deleteCurrentTutor">Delete</button>
			<button @click="editCurrentTutor">{{ currentTutor.saveEdit }}</button>
		</div>

		<hr />

		<h2>Users</h2>

		<div v-for="u in users" :key="u._id" class="tutorList mt-2">
			<br />
			<ul>
				<!-- Editable -->
				<template v-if="u.editUsers">
					<li>
						<label>
							Name:&emsp;
							<input v-model="u.name" class="editTutor" type="text" />
						</label>
					</li>
					<li>
						<label>
							Email:&emsp;
							<input v-model="u.email" class="editTutor" type="text" />
						</label>
					</li>
					<li>
						<label>
							Age:&emsp;
							<input v-model="u.age" class="editTutor" type="text" />
						</label>
					</li>
					<li>
						<label>
							State:&emsp;
							<input v-model="u.state" class="editTutor" type="text" />
						</label>
					</li>
				</template>

				<!-- Display -->
				<template v-else>
					<li>
						<label class="hidden">Name:</label>&emsp;
						<p>{{ u.name }}</p>
					</li>
					<li>
						<label class="hidden">Email:</label>&emsp;
						<p>{{ u.email }}</p>
					</li>
					<li>
						<label class="hidden">Age:</label>&emsp;
						<p>{{ u.age }}</p>
					</li>
					<li>
						<label class="hidden">State:</label>&emsp;
						<p>{{ u.state }}</p>
					</li>
				</template>
			</ul>
			<br />

			<button @click="deleteUser(u)">Delete</button>
			<button @click="editUser(u)">{{ u.saveEdit }}</button>
		</div>

		<p v-if="error" class="error">{{ error }}</p>
	</section>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import axios from "axios";
import { useAppStore, type User } from "@/stores/app";

// grab your Pinia store instance
const app = useAppStore();
const { currentTutor, users } = storeToRefs(app);
const error = ref("");

let originalTutorEmail = "";

// load users for this tutor
async function getUsers() {
	if (!currentTutor.value) return;
	try {
		const { data } = await axios.get<User[]>(
			`/api/users/oftutor/${currentTutor.value._id}`
		);
		app.setUsers(data);
	} catch (e: any) {
		error.value = "Error: " + (e.response?.data?.message ?? e.message);
	}
}

// refresh tutor from server (after edits)
async function refreshTutor() {
	await app.refreshCurrentTutor();
}

// CRUD
async function editUser(u: User) {
	try {
		await axios.put(`/api/users/tutor/${u._id}`, {
			...u,
			editUsers: !u.editUsers,
			saveEdit: u.editUsers ? "Edit" : "Save"
		});
		await getUsers();
	} catch (e: any) {
		error.value = "Error: " + (e.response?.data?.message ?? e.message);
	}
}

async function deleteUser(u: User) {
	try {
		await axios.delete(`/api/users/tutor/${u._id}`);
		await getUsers();
	} catch (e: any) {
		error.value = "Error: " + (e.response?.data?.message ?? e.message);
	}
}

async function editCurrentTutor() {
	if (!currentTutor.value) return;

	try {
		if (!originalTutorEmail) originalTutorEmail = currentTutor.value.email;

		if (currentTutor.value.email !== originalTutorEmail) {
			await axios.post(
				`/api/accounts/changeEmail/${currentTutor.value._id}`,
				{ email: currentTutor.value.email }
			);
			originalTutorEmail = currentTutor.value.email;
		}

		await axios.put(`/api/tutors/${currentTutor.value._id}`, {
			...currentTutor.value,
			editTutors: !currentTutor.value.editTutors,
			saveEdit: currentTutor.value.editTutors ? "Edit" : "Save"
		});

		await refreshTutor();
	} catch (e: any) {
		error.value = "Error: " + (e.response?.data?.message ?? e.message);
	}
}

async function deleteCurrentTutor() {
	if (!currentTutor.value) return;
	try {
		await axios.delete(`/api/tutors/remove/${currentTutor.value._id}`);
		app.setCurrentTutor(null);
	} catch (e: any) {
		error.value = "Error: " + (e.response?.data?.message ?? e.message);
	}
}

// initial load
onMounted(getUsers);
</script>

<style scoped>
ul {
	display: flex;
	flex-direction: column;
}

ul p {
	display: inline;
}

div.tutorList, li {
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

@media (max-width: 960px) {
	div.tutorList {
		width: 50%;
	}
}

.error {
	color: red;
	margin-top: 10px;
}
</style>
