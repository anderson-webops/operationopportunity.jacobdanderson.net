<script lang="ts" setup>
import axios from "axios";
import { storeToRefs } from "pinia";
import { onMounted, ref } from "vue";
import ProfileFields from "@/components/ProfileFields.vue";
import { useDeleteAccount } from "@/composables/useDeleteAccount";
import { useEditable } from "@/composables/useEditable";
import { useAppStore } from "@/stores/app";

/* -------------------------------------------------- */
const app = useAppStore();
const { currentTutor, users } = storeToRefs(app);
const error = ref("");
const deleteMe = useDeleteAccount("tutor");

/* editable (the tutor card itself) */
const {
	editing: tutorEdit,
	toggle: toggleTutor,
	save: saveTutor
} = useEditable("tutor");

/* field list */
const tutorFields = [
	{ key: "name", label: "Name" },
	{ key: "email", label: "Email" },
	{ key: "age", label: "Age" },
	{ key: "state", label: "State" }
];

/* load this tutor’s users once */
async function loadUsers() {
	if (!currentTutor.value) return;
	try {
		const { data } = await axios.get(
			`/api/users/oftutor/${currentTutor.value._id}`
		);
		app.setUsers(data);
	} catch (e: any) {
		error.value = e.message;
	}
}

onMounted(loadUsers);
</script>

<template>
	<section class="Signup text-center">
		<h2>Profile</h2>

		<!-- ───── Tutor card ───── -->
		<div v-if="currentTutor" class="tutorList mt-2">
			<br />
			<ul>
				<li><h4>Tutor</h4></li>

				<ProfileFields
					:editing="tutorEdit"
					:entity="currentTutor"
					:fields="tutorFields"
				/>
			</ul>
			<br />

			<button class="btn-danger btn" @click="deleteMe(currentTutor!._id)">
				Delete
			</button>
			<button
				class="btn-primary btn"
				@click="tutorEdit ? saveTutor(currentTutor) : toggleTutor()"
			>
				{{ tutorEdit ? "Save" : "Edit" }}
			</button>
		</div>

		<!-- ───── Users under this tutor (read-only) ───── -->
		<hr />
		<h2>Users</h2>

		<div v-for="u in users" :key="u._id" class="tutorList mt-2">
			<br />
			<ul>
				<!-- Fields: name / email / age / state -->
				<!-- Editing = false: read-only list -->
				<ProfileFields
					:editing="false"
					:entity="u"
					:fields="tutorFields"
				/>
			</ul>
		</div>

		<p v-if="error" class="error">
			{{ error }}
		</p>
	</section>
</template>

<style scoped>
ul {
	display: flex;
	flex-direction: column;
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
