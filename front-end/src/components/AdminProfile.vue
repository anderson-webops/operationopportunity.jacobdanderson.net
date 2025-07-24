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
					<label>
						Name:&emsp;
						<input
							v-model="currentAdmin.name"
							class="editTutor"
							type="text"
						/>
					</label>
				</li>
				<li v-if="currentAdmin.editAdmins">
					<label>
						Email:&emsp;
						<input
							v-model="currentAdmin.email"
							class="editTutor"
							type="text"
						/>
					</label>
				</li>

				<!-- Display fields -->
				<li v-else>
					<label class="hidden">Name:</label>&emsp;
					<p>{{ currentAdmin.name }}</p>
				</li>
				<li v-else>
					<label class="hidden">Email:</label>&emsp;
					<p>{{ currentAdmin.email }}</p>
				</li>
			</ul>
			<br />

			<button @click="deleteAdmin">Delete</button>
			<button @click="editAdmin">{{ currentAdmin.saveEdit }}</button>
		</div>

		<hr />

		<!-- ------------------  Tutors  ------------------ -->
		<h2>Tutors</h2>

		<div v-for="t in tutors" :key="t._id" class="tutorList mt-2">
			<br />
			<ul>
				<li><h4>Tutor</h4></li>

				<!-- Editable -->
				<template v-if="t.editTutors">
					<li>
						<label>
							Name:&emsp;
							<input v-model="t.name" class="editTutor" type="text" />
						</label>
					</li>
					<li>
						<label>
							Email:&emsp;
							<input v-model="t.email" class="editTutor" type="text" />
						</label>
					</li>
					<li>
						<label>
							Age:&emsp;
							<input v-model="t.age" class="editTutor" type="text" />
						</label>
					</li>
					<li>
						<label>
							State:&emsp;
							<input v-model="t.state" class="editTutor" type="text" />
						</label>
					</li>
				</template>

				<!-- Display -->
				<template v-else>
					<li>
						<label class="hidden">Name:</label>&emsp;
						<p>{{ t.name }}</p>
					</li>
					<li>
						<label class="hidden">Email:</label>&emsp;
						<p>{{ t.email }}</p>
					</li>
					<li>
						<label class="hidden">Age:</label>&emsp;
						<p>{{ t.age }}</p>
					</li>
					<li>
						<label class="hidden">State:</label>&emsp;
						<p>{{ t.state }}</p>
					</li>
				</template>
			</ul>
			<br />

			<button @click="deleteTutor(t)">Delete</button>
			<button @click="editTutor(t)">{{ t.saveEdit }}</button>
		</div>

		<hr />

		<!-- ------------------  Users  ------------------ -->
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
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import axios from "axios";
import { type Tutor, useAppStore, type User } from "@/stores/app";

const app = useAppStore();
const { currentAdmin, tutors, users, error } = storeToRefs(app);

let originalAdminEmail = "";

/* ------------------------------------------------------------------ */
/*  Data fetching / refresh                                           */
/* ------------------------------------------------------------------ */
async function getTutors() {
	await app.fetchTutors();
}

async function getUsers() {
	await app.fetchUsers();
}

async function refreshAdmin() {
	await app.refreshCurrentAdmin();
}

/* ------------------------------------------------------------------ */
/*  CRUD actions                                                      */
/* ------------------------------------------------------------------ */
async function editUser(u: User) {
	try {
		await axios.put(`/api/admins/user/${u._id}`, {
			...u,
			editUsers: !u.editUsers,
			saveEdit: u.editUsers ? "Edit" : "Save"
		});
		await Promise.all([app.fetchTutors(), app.fetchUsers()]);
	} catch (e: any) {
		app.setError("Error: " + (e.response?.data?.message ?? e.message));
	}
}

async function deleteUser(u: User) {
	try {
		await axios.delete(`/api/admins/user/${u._id}`);
		await app.fetchUsers();
	} catch (e: any) {
		app.setError("Error: " + (e.response?.data?.message ?? e.message));
	}
}

async function editTutor(t: Tutor) {
	try {
		await axios.put(`/api/admins/tutor/${t._id}`, {
			...t,
			editTutors: !t.editTutors,
			saveEdit: t.editTutors ? "Edit" : "Save"
		});
		await Promise.all([app.fetchTutors(), app.fetchUsers()]);
	} catch (e: any) {
		app.setError("Error: " + (e.response?.data?.message ?? e.message));
	}
}

async function deleteTutor(t: Tutor) {
	try {
		await axios.delete(`/api/admins/tutor/${t._id}`);
		await app.fetchTutors();
	} catch (e: any) {
		app.setError("Error: " + (e.response?.data?.message ?? e.message));
	}
}

async function editAdmin() {
	if (!currentAdmin.value) return;

	try {
		if (!originalAdminEmail) originalAdminEmail = currentAdmin.value.email;

		if (currentAdmin.value.email !== originalAdminEmail) {
			await axios.post(
				`/api/accounts/changeEmail/${currentAdmin.value._id}`,
				{ email: currentAdmin.value.email }
			);
			originalAdminEmail = currentAdmin.value.email;
		}

		await axios.put(`/api/admins/${currentAdmin.value._id}`, {
			...currentAdmin.value,
			editAdmins: !currentAdmin.value.editAdmins,
			saveEdit: currentAdmin.value.editAdmins ? "Edit" : "Save"
		});

		await refreshAdmin();
	} catch (e: any) {
		app.setError("Error: " + (e.response?.data?.message ?? e.message));
	}
}

async function deleteAdmin() {
	if (!currentAdmin.value) return;
	try {
		await axios.delete(`/api/admins/remove/${currentAdmin.value._id}`);
		app.setCurrentAdmin(null);
	} catch (e: any) {
		app.setError("Error: " + (e.response?.data?.message ?? e.message));
	}
}

/* ------------------------------------------------------------------ */
/*  Lifecycle                                                         */
/* ------------------------------------------------------------------ */
onMounted(async () => {
	try {
		await Promise.all([getTutors(), getUsers(), refreshAdmin()]);
	} catch (e: any) {
		app.setError("Error: " + (e.response?.data?.message ?? e.message));
	}
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

@media only screen and (max-width: 960px) {
	div.tutorList {
		width: 50%;
	}
}

.error {
	color: red;
	margin-top: 10px;
}
</style>
