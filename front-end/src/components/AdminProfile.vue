<template>
	<section class="Signup text-center">
		<h2>Profile</h2>

		<!-- ───── Admin card ───── -->
		<div v-if="currentAdmin" class="tutorList mt-2">
			<br />
			<ul>
				<li><h4>Admin</h4></li>

				<ProfileFields
					:editing="adminEdit"
					:entity="currentAdmin"
					:fields="fields"
				/>
			</ul>
			<br />

			<button class="btn btn-danger" @click="deleteMe(currentAdmin!._id)">Delete</button>
			<button class="btn btn-primary"
							@click="adminEdit ? saveAdmin(currentAdmin) : toggleAdmin()">
				{{ adminEdit ? "Save" : "Edit" }}
			</button>
		</div>

		<!-- ───── Tutors list (read-only) ───── -->
		<hr />
		<h2>Tutors</h2>
		<div v-for="t in tutors" :key="t._id" class="tutorList mt-2">
			<br />
			<ul>
				<ProfileFields :editing="false" :entity="t" :fields="fields" />
			</ul>
		</div>

		<!-- ───── Users list (read-only) ───── -->
		<hr />
		<h2>Users</h2>
		<div v-for="u in users" :key="u._id" class="tutorList mt-2">
			<br />
			<ul>
				<ProfileFields :editing="false" :entity="u" :fields="fields" />
			</ul>
		</div>

		<p v-if="error" class="error">{{ error }}</p>
	</section>
</template>

<script lang="ts" setup>
import { useDeleteAccount } from "@/composables/useDeleteAccount";
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "@/stores/app";
import { useEditable } from "@/composables/useEditable";
import ProfileFields from "@/components/ProfileFields.vue";

/* -------------------------------------------------- */
const app = useAppStore();
const { currentAdmin, tutors, users } = storeToRefs(app);
const error = ref("");
const deleteMe = useDeleteAccount("admin");

/* editable helper for the admin card */
const {
	editing: adminEdit,
	toggle: toggleAdmin,
	save: saveAdmin
} = useEditable("admin");

/* field list (admin / tutor / user share the same set) */
const fields = [
	{ key: "name", label: "Name" },
	{ key: "email", label: "Email" },
	{ key: "age", label: "Age" },
	{ key: "state", label: "State" }
];

/* fetch everything once */
async function loadAll() {
	await Promise.all([app.fetchTutors(), app.fetchUsers(), app.refreshCurrentAdmin()]);
}

onMounted(loadAll);
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
