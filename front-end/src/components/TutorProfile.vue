<script lang="ts" setup>
import type { User } from "@/stores/app";

import { storeToRefs } from "pinia";
import ChangeCredentials from "@/components/ChangeCredentials.vue";
import DirectoryControls from "@/components/DirectoryControls.vue";
import ProfileFields from "@/components/ProfileFields.vue";
import { useDeleteAccount } from "@/composables/useDeleteAccount";
import { useDirectory } from "@/composables/useDirectory";
import { useEditable } from "@/composables/useEditable";
import { useAppStore } from "@/stores/app";

/* -------------------------------------------------- */
const app = useAppStore();
const { currentTutor } = storeToRefs(app);
const directory = useDirectory<User>(
	() => `/users/oftutor/${currentTutor.value?._id}`,
	() => currentTutor.value?.status === "active"
);
const { items: users, error } = directory;
const deleteMe = useDeleteAccount("tutor");

/* editable (the tutor card itself) */
const {
	editing: tutorEdit,
	toggle: toggleTutor,
	save: saveTutor,
	draft: profileDraft,
	pending: profilePending,
	error: profileError,
	message: profileMessage
} = useEditable("tutor");

/* field list */
const tutorFields = [
	{ key: "name", label: "Name" },
	{ key: "age", label: "Age" },
	{ key: "state", label: "State" }
];
const userFields = [
	{ key: "name", label: "Name" },
	{ key: "email", label: "Email" },
	{ key: "age", label: "Age" },
	{ key: "state", label: "State" }
];
</script>

<template>
	<section class="Signup text-center">
		<h2>Profile</h2>

		<!-- ───── Tutor card ───── -->
		<div v-if="currentTutor" class="tutorList mt-2">
			<br />
			<ul>
				<li><h4>Tutor</h4></li>
				<li v-if="currentTutor.status !== 'active'">Account status: {{ currentTutor.status }}</li>

				<ProfileFields
					:editing="tutorEdit"
					:entity="tutorEdit ? profileDraft : currentTutor"
					:fields="tutorFields"
				/>
				<li><strong>Email:</strong> {{ currentTutor.email }}</li>
			</ul>
			<br />

			<button class="btn-danger btn" @click="deleteMe(currentTutor!._id)">Delete</button>
			<button
				class="btn-primary btn"
				:disabled="profilePending"
				@click="tutorEdit ? saveTutor(profileDraft) : toggleTutor()"
			>
				{{ tutorEdit ? "Save" : "Edit" }}
			</button>
		</div>
		<p v-if="profileError" class="error" role="alert">{{ profileError }}</p>
		<p v-if="profileMessage" role="status">{{ profileMessage }}</p>
		<ChangeCredentials v-if="currentTutor" :account="currentTutor" kind="tutor" />

		<!-- ───── Users under this tutor (read-only) ───── -->
		<hr v-if="currentTutor?.status === 'active'" />
		<h2 v-if="currentTutor?.status === 'active'">Users</h2>
		<DirectoryControls
			v-if="currentTutor?.status === 'active'"
			v-model="directory.query.value"
			label="users"
			:loading="directory.loading.value"
			:error="directory.error.value"
			:next="Boolean(directory.nextCursor.value)"
			:previous="Boolean(directory.previousCursor.value)"
			@search="directory.search"
			@next="directory.next"
			@previous="directory.previous"
			@refresh="directory.refresh"
		/>

		<div v-for="u in users" :key="u._id" class="tutorList mt-2">
			<br />
			<ul>
				<!-- Fields: name / email / age / state -->
				<!-- Editing = false: read-only list -->
				<ProfileFields :editing="false" :entity="u" :fields="userFields" />
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
