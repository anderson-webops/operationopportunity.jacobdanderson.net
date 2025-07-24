<template>
	<section class="Signup text-center">
		<h2>Profile</h2>

		<div v-if="currentUser" :key="currentUser._id" class="tutorList mt-2">
			<br />
			<ul>
				<li><h4>User</h4></li>

				<!-- Editable -->
				<template v-if="currentUser.editUsers">
					<li>
						<label>
							Name:&emsp;
							<input v-model="currentUser.name" class="editTutor" type="text" />
						</label>
					</li>
					<li>
						<label>
							Email:&emsp;
							<input v-model="currentUser.email" class="editTutor" type="text" />
						</label>
					</li>
					<li>
						<label>
							Age:&emsp;
							<input v-model="currentUser.age" class="editTutor" type="text" />
						</label>
					</li>
					<li>
						<label>
							State:&emsp;
							<input v-model="currentUser.state" class="editTutor" type="text" />
						</label>
					</li>
				</template>

				<!-- Read-only -->
				<template v-else>
					<li>
						<label class="hidden">Name:</label>&emsp;
						<p>{{ currentUser.name }}</p>
					</li>
					<li>
						<label class="hidden">Email:</label>&emsp;
						<p>{{ currentUser.email }}</p>
					</li>
					<li>
						<label class="hidden">Age:</label>&emsp;
						<p>{{ currentUser.age }}</p>
					</li>
					<li>
						<label class="hidden">State:</label>&emsp;
						<p>{{ currentUser.state }}</p>
					</li>
				</template>
			</ul>
			<br />

			<button @click="deleteUser">Delete</button>
			<button @click="editUser">{{ currentUser.saveEdit }}</button>
		</div>

		<p v-if="error" class="error">{{ error }}</p>
	</section>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";
import { storeToRefs } from "pinia";
import axios from "axios";
import { useAppStore } from "@/stores/app";

const app = useAppStore();
const { currentUser } = storeToRefs(app);
const error = ref("");

let originalEmail = "";

// refresh on load and if someone clears the store
async function refreshUser() {
	try {
		await app.refreshCurrentUser();
	} catch {
		app.setCurrentUser(null);
	}
}

async function editUser() {
	if (!currentUser.value) return;

	try {
		// keep baseline email
		if (!originalEmail) originalEmail = currentUser.value.email;

		// only hit changeEmail if needed
		if (currentUser.value.email !== originalEmail) {
			await axios.post(
				`/api/accounts/changeEmail/${currentUser.value._id}`,
				{ email: currentUser.value.email },
				{ withCredentials: true }              // if you still need cookies for that
			);
			originalEmail = currentUser.value.email;
		}

		// save the rest of the profile
		await axios.put(
			`/api/users/user/${currentUser.value._id}`,
			{
				...currentUser.value,
				editUsers: !currentUser.value.editUsers,
				saveEdit : currentUser.value.editUsers ? "Edit" : "Save",
			},
			{ withCredentials: true }
		);

		// **instead** of re‐fetching from the server, update Pinia directly:**
		app.setCurrentUser({
			...currentUser.value,
			editUsers: !currentUser.value.editUsers,
			saveEdit : currentUser.value.editUsers ? "Edit" : "Save",
		});

	} catch (e: any) {
		error.value = "Error: " + (e.response?.data?.message ?? e.message);
	}
}

async function deleteUser() {
	if (!currentUser.value) return;
	try {
		await axios.delete(`/api/users/user/${currentUser.value._id}`);
		app.setCurrentUser(null);
	} catch (e: any) {
		error.value = "Error: " + (e.response?.data?.message ?? e.message);
	}
}

// if store gets cleared (hard refresh), fetch again
watch(
	() => currentUser.value,
	(val) => {
		if (!val) refreshUser();
	},
	{ immediate: true }
);
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
