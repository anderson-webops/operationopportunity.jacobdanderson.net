<template>
	<div>
		<h2 class="mt-5">Sign Up</h2>

		<!-- ------------------------------------------------ Form -->
		<div id="signup">
			<form id="signupForm" @submit.prevent="addUser">
				<select
					v-if="tutors.length"
					id="tutorSelect"
					v-model="selectedTutor"
					required
				>
					<option v-for="t in tutors" :key="t._id" :value="t">{{ t.name }}</option>
				</select>
				<p v-else class="notutors">No Tutors are available</p>

				<br />
				<button id="infoSubmit" class="mt-3" type="submit">Submit</button>
			</form>

			<!-- ------------------------------------------------ Toggle -->
			<button
				v-if="tutors.length"
				@click="showTutors = !showTutors"
			>
				{{ showTutors ? 'Hide' : 'Show' }} tutors
			</button>

			<hr v-if="showTutors && tutors.length" />

			<!-- ------------------------------------------------ Stats -->
			<template v-if="tutors.length">
				<h3>Total Tutors: {{ tutors.length }}</h3>
				<h3>Total Users : {{ numberOfUsers }}</h3>
			</template>

			<!-- ------------------------------------------------ Tutor cards -->
			<div
				v-for="t in tutors"
				v-show="showTutors"
				:key="t._id"
				class="tutorList mt-2"
			>
				<br />
				<ul>
					<template v-if="!t.editTutors">
						<li><label class="hidden">Name:</label>&emsp;<p>{{ t.name }}</p></li>
						<li><label class="hidden">Email:</label>&emsp;<p>{{ t.email }}</p></li>
						<li><label class="hidden">Age:</label>&emsp;<p>{{ t.age }}</p></li>
						<li><label class="hidden">State:</label>&emsp;<p>{{ t.state }}</p></li>
						<li><label class="hidden">Users:</label>&emsp;<p>{{ t.usersOfTutorLength }}</p></li>
					</template>

					<template v-else>
						<li><label>Name:&emsp;<input v-model="t.name"  class="editTutor" type="text" /></label></li>
						<li><label>Email:&emsp;<input v-model="t.email" class="editTutor" type="text" /></label></li>
						<li><label>Age:&emsp;<input  v-model="t.age"   class="editTutor" type="text" /></label></li>
						<li><label>State:&emsp;<input v-model="t.state" class="editTutor" type="text" /></label></li>
					</template>
				</ul>
				<br />

				<!-- Admin / owner controls -->
				<button
					v-if="admin || currentTutor?. _id === t._id"
					@click="deleteTutor(t)"
				>Remove</button>

				<button
					v-if="admin || currentTutor?. _id === t._id"
					@click="editTutor(t)"
				>{{ t.saveEdit }}</button>

				<!-- user “select” -->
				<button
					v-if="currentUser"
					:class="{ colorSelect : currentUser.tutor?._id === t._id }"
					@click="selectTutor(t)"
				>Select</button>
			</div>
		</div>

		<p v-if="error" class="error">{{ error }}</p>
	</div>
</template>

<script setup lang="ts">
/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
interface Tutor {
	_id: string;
	name: string;
	email: string;
	age: string;
	state: string;
	usersOfTutorLength: number;
	editTutors: boolean;
	saveEdit: string;
}

interface User {
	_id: string;
	tutor?: { _id: string };
}

/* ------------------------------------------------------------------ */
import { ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import axios from "axios";

const store           = useStore();
const error           = ref<string>("");

const selectedTutor   = ref<Tutor | null>(null);
const showTutors      = ref(false);
const numberOfUsers   = ref(0);

/* -------------------------------------------------- Vuex shortcuts */
const tutors        = computed<Tutor[]>(() => store.state.tutors);
const currentUser   = computed<User  | null>(() => store.state.currentUser);
const currentTutor  = computed<Tutor | null>(() => store.state.currentTutor);
const admin         = computed(()    => store.state.currentAdmin);

/* ------------------------------------------------------------------ */
/*  API helpers                                                       */
/* ------------------------------------------------------------------ */
const getTutors = async () => {
	const { data } = await axios.get<Tutor[]>("/api/tutors");
	store.commit("setTutors", data);
	if (data.length && !selectedTutor.value) selectedTutor.value = data[0];
};

const getUsers = async (t: Tutor | null) => {
	await getNumberOfUsers();
	if (!t) return;

	if (numberOfUsers.value) {
		const { data } = await axios.get(`/api/users/oftutor/${t._id}`);
		store.commit("setUsers", data);
		await syncTutorUserCount(t, data.length);
	}
};

const getNumberOfUsers = async () => {
	const { data } = await axios.get("/api/users/all");
	numberOfUsers.value = data.length;
};

const syncTutorUserCount = async (t: Tutor, count: number) => {
	await axios.put(`/api/tutors/${t._id}`, {
		...t,
		usersOfTutorLength: count
	});
};

/* ------------------------------------------------------------------ */
/*  Form actions                                                      */
/* ------------------------------------------------------------------ */
const addUser = async () => {
	if (!selectedTutor.value || !selectedTutor.value._id) {
		error.value = "No tutor selected.";
		return;
	}

	try {
		await axios.post(
			`/api/users/${selectedTutor.value._id}`,
			{ currentUser: store.state.currentUser }
		);
		await getUsers(selectedTutor.value);
	} catch (e: any) {
		error.value = "Error: " + e.response?.data?.message;
	}
};

const selectTutor = async (t: Tutor) => {
	if (!currentUser.value) return;
	try {
		await axios.put(`/api/users/selectTutor/${currentUser.value._id}/${t._id}`);
		const { data }  = await axios.get("/api/users/loggedin");
		store.commit("setCurrentUser", data.currentUser);
	} catch (e: any) { error.value = "Error: " + e.response?.data?.message; }
};

/* -------------------- Tutor CRUD (admin / owner only) ------------- */
const editTutor = async (t: Tutor) => {
	if (!admin.value && currentTutor.value?._id !== t._id) return;
	try {
		await axios.put(`/api/tutors/${t._id}`, {
			...t,
			editTutors: !t.editTutors,
			saveEdit  : t.editTutors ? "Edit" : "Save"
		});
		await getTutors();
	} catch (e: any) { error.value = "Error: " + e.response?.data?.message; }
};

const deleteTutor = async (t: Tutor) => {
	if (!admin.value && currentTutor.value?._id !== t._id) return;
	try {
		await getUsers(t);                                 // load users once
		await axios.delete(`/api/users/under/${t._id}`);   // cascade delete
		await axios.delete(`/api/tutors/remove/${t._id}`);
		await getTutors();
		await getUsers(null);
	} catch (e: any) { error.value = "Error: " + e.response?.data?.message; }
};

/* ------------------------------------------------------------------ */
/*  Lifecycle                                                         */
/* ------------------------------------------------------------------ */
onMounted(() => {
	getTutors()
		.then(() => getUsers(selectedTutor.value))
		.catch(() => {});
});
</script>

<style scoped>
ul              { display:flex; flex-flow:column; }
ul p            { display:inline; }
div.tutorList,
li              { align-self:center; }
.hidden         { display:none; }
.colorSelect    { color:blue; background:lightblue; }
div.tutorList   { outline:black solid 1px; padding-bottom:1%; width:35%; margin:auto; }
.notutors       { text-align:center; }
@media (max-width:960px){
	div.tutorList { width:50%; }
}
.error          { color:red; margin-top:10px; }
</style>
