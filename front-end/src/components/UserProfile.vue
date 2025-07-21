<template>
	<section class="Signup text-center">
		<h2>Profile</h2>

		<div v-if="currentUser" :key="currentUser._id" class="tutorList mt-2">
			<br />
			<ul>
				<li><h4>User</h4></li>

				<!-- Editable -->
				<template v-if="currentUser.editUsers">
					<li><label>Name:&emsp;<input  v-model="currentUser.name"  class="editTutor" type="text" /></label></li>
					<li><label>Email:&emsp;<input v-model="currentUser.email" class="editTutor" type="text" /></label></li>
					<li><label>Age:&emsp;<input   v-model="currentUser.age"   class="editTutor" type="text" /></label></li>
					<li><label>State:&emsp;<input v-model="currentUser.state" class="editTutor" type="text" /></label></li>
				</template>

				<!-- Read-only -->
				<template v-else>
					<li><label class="hidden">Name:</label>&emsp;<p>{{ currentUser.name  }}</p></li>
					<li><label class="hidden">Email:</label>&emsp;<p>{{ currentUser.email }}</p></li>
					<li><label class="hidden">Age:</label>&emsp;<p>{{ currentUser.age   }}</p></li>
					<li><label class="hidden">State:</label>&emsp;<p>{{ currentUser.state }}</p></li>
				</template>
			</ul>
			<br />

			<button @click="deleteUser">Delete</button>
			<button @click="editUser">{{ currentUser.saveEdit }}</button>
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
	tutor?: { _id: string };        // only needed elsewhere, keep loose
}

/* ------------------------------------------------------------------ */
import { ref, computed, watch } from "vue";
import { useStore } from "vuex";
import axios from "axios";

const store        = useStore();
const error        = ref<string>("");

const currentUser  = computed<User | null>(() => store.state.currentUser);

/* ------------------------------------------------------------------ */
/*  Actions                                                           */
/* ------------------------------------------------------------------ */
const refreshUser = async () => {
	const { data } = await axios.get<{ currentUser: User }>("/api/users/loggedin");
	store.commit("setCurrentUser", data.currentUser);
};

const editUser = async () => {
	if (!currentUser.value) return;
	try {
		// keep email unique across collections
		await axios.post(`/api/accounts/changeEmail/${currentUser.value._id}`, {
			email: currentUser.value.email
		});

		await axios.put(`/api/users/user/${currentUser.value._id}`, {
			...currentUser.value,
			editUsers: !currentUser.value.editUsers,
			saveEdit : currentUser.value.editUsers ? "Edit" : "Save"
		});

		await refreshUser();
	} catch (e: any) {
		error.value = "Error: " + e.response?.data?.message;
	}
};

const deleteUser = async () => {
	if (!currentUser.value) return;
	try {
		await axios.delete(`/api/users/user/${currentUser.value._id}`);
		store.commit("setCurrentUser", null);
	} catch (e: any) {
		error.value = "Error: " + e.response?.data?.message;
	}
};

/* optional: if store might be empty on hard refresh */
watch(
	() => currentUser.value,
	(val) => { if (!val) refreshUser().catch(() => {}); },
	{ immediate: true }
);
</script>

<style scoped>
/* identical utility styles */
ul              { display:flex; flex-flow:column; }
ul p            { display:inline; }
div.tutorList, li { align-self:center; }
.hidden         { display:none; }
div.tutorList   { outline:black solid 1px; padding-bottom:1%; width:35%; margin:auto; }
@media (max-width:960px){
	div.tutorList { width:50%; }
}
.error          { color:red; margin-top:10px; }
</style>
