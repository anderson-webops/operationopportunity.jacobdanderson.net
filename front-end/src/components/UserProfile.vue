<template>
	<section class="Signup text-center">
		<h2>Profile</h2>

		<div v-if="currentUser" class="tutorList mt-2">
			<br />
			<ul>
				<li><h4>User</h4></li>

				<ProfileFields
					:editing="editing"
					:entity="currentUser"
					:fields="fields"
				/>
			</ul>
			<br />

			<button class="btn btn-danger" @click="deleteMe(currentUser!._id)">Delete</button>
			<button class="btn btn-primary" @click="editing ? save(currentUser) : toggle()">
				{{ editing ? "Save" : "Edit" }}
			</button>
		</div>
	</section>
</template>

<script lang="ts" setup>
import { useDeleteAccount } from "@/composables/useDeleteAccount";
import { storeToRefs } from "pinia";
import { useAppStore } from "@/stores/app";
import { useEditable } from "@/composables/useEditable";
import ProfileFields from "@/components/ProfileFields.vue";

/* -------------------------------------------------- */
/*  Pinia state                                       */
/* -------------------------------------------------- */
const app = useAppStore();
const { currentUser } = storeToRefs(app);
const deleteMe = useDeleteAccount("user");

/* -------------------------------------------------- */
/*  editable helper                                   */
/* -------------------------------------------------- */
const { editing, toggle, save } = useEditable("user");

/* -------------------------------------------------- */
/*  field list (only once)                            */
/* -------------------------------------------------- */
const fields = [
	{ key: "name", label: "Name" },
	{ key: "email", label: "Email" },
	{ key: "age", label: "Age" },
	{ key: "state", label: "State" }
];
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
