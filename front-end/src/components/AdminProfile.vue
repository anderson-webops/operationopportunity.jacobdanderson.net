<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { onMounted, reactive, ref } from "vue";
import { api } from "@/api";
import ChangeCredentials from "@/components/ChangeCredentials.vue";
import ProfileFields from "@/components/ProfileFields.vue";
import { useDeleteAccount } from "@/composables/useDeleteAccount";
import { useEditable } from "@/composables/useEditable";
import { confirmDestructiveAction } from "@/security/confirm";
import { useAppStore } from "@/stores/app";

/* -------------------------------------------------- */
const app = useAppStore();
const { admins, currentAdmin, tutors, users } = storeToRefs(app);
const error = ref("");
const message = ref("");
const deleteMe = useDeleteAccount("admin");
const newAdmin = reactive({
	name: "",
	email: "",
	password: "",
	editAdmins: false
});

/* editable helper for the admin card */
const {
	editing: adminEdit,
	toggle: toggleAdmin,
	save: saveAdmin
} = useEditable("admin");

const adminFields = [{ key: "name", label: "Name" }];
const memberFields = [
	{ key: "name", label: "Name" },
	{ key: "email", label: "Email" },
	{ key: "age", label: "Age" },
	{ key: "state", label: "State" }
];

/* fetch everything once */
async function loadAll() {
	await Promise.all([
		app.fetchAdmins(),
		app.fetchAllTutors(),
		app.fetchUsers(),
		app.refreshCurrentAdmin()
	]);
}

onMounted(loadAll);

async function setTutorStatus(tutorId: string, status: "active" | "suspended") {
	error.value = "";
	message.value = "";
	try {
		await api.patch(`/tutors/${tutorId}/status`, { status });
		await app.fetchAllTutors();
		message.value =
			status === "active"
				? "Tutor approved."
				: "Tutor suspended and unassigned.";
	} catch (caught: any) {
		error.value = caught.response?.data?.message ?? caught.message;
	}
}

async function createAdmin() {
	error.value = "";
	message.value = "";
	try {
		await api.post("/admins", { ...newAdmin });
		Object.assign(newAdmin, {
			name: "",
			email: "",
			password: "",
			editAdmins: false
		});
		await app.fetchAdmins();
		message.value = "Admin account created.";
	} catch (caught: any) {
		error.value = caught.response?.data?.message ?? caught.message;
	}
}

async function setAdminManager(adminId: string, editAdmins: boolean) {
	error.value = "";
	message.value = "";
	try {
		const { data } = await api.put(`/admins/${adminId}`, { editAdmins });
		if (adminId === currentAdmin.value?._id)
			app.setCurrentAdmin(data.currentAdmin);
		await app.fetchAdmins();
		message.value = editAdmins
			? "Admin-management privilege granted."
			: "Admin-management privilege revoked.";
	} catch (caught: any) {
		error.value = caught.response?.data?.message ?? caught.message;
	}
}

async function removeAdmin(adminId: string) {
	if (!confirmDestructiveAction("Permanently delete this admin account?"))
		return;
	error.value = "";
	message.value = "";
	try {
		await api.delete(`/admins/remove/${adminId}`);
		await app.fetchAdmins();
		message.value = "Admin account deleted.";
	} catch (caught: any) {
		error.value = caught.response?.data?.message ?? caught.message;
	}
}

async function removeTutor(tutorId: string) {
	if (
		!confirmDestructiveAction(
			"Delete this tutor and unassign all of their users?"
		)
	) {
		return;
	}
	error.value = "";
	message.value = "";
	try {
		await api.delete(`/tutors/remove/${tutorId}`);
		await app.fetchAllTutors();
		await app.fetchUsers();
		message.value = "Tutor deleted and users unassigned.";
	} catch (caught: any) {
		error.value = caught.response?.data?.message ?? caught.message;
	}
}

async function removeUser(userId: string) {
	if (!confirmDestructiveAction("Permanently delete this user account?"))
		return;
	error.value = "";
	message.value = "";
	try {
		await api.delete(`/users/admin/${userId}`);
		await app.fetchUsers();
		message.value = "User account deleted.";
	} catch (caught: any) {
		error.value = caught.response?.data?.message ?? caught.message;
	}
}
</script>

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
					:fields="adminFields"
				/>
				<li><strong>Email:</strong> {{ currentAdmin.email }}</li>
			</ul>
			<br />

			<button class="btn-danger btn" @click="deleteMe(currentAdmin!._id)">
				Delete
			</button>
			<button
				class="btn-primary btn"
				@click="adminEdit ? saveAdmin(currentAdmin) : toggleAdmin()"
			>
				{{ adminEdit ? "Save" : "Edit" }}
			</button>
		</div>
		<ChangeCredentials
			v-if="currentAdmin"
			:account="currentAdmin"
			kind="admin"
		/>

		<hr />
		<h2>Admins</h2>
		<form
			v-if="currentAdmin?.editAdmins"
			class="admin-create"
			@submit.prevent="createAdmin"
		>
			<h3>Create admin</h3>
			<label>
				Name
				<input v-model="newAdmin.name" maxlength="100" required />
			</label>
			<label>
				Email
				<input
					v-model="newAdmin.email"
					autocomplete="off"
					maxlength="254"
					required
					type="email"
				/>
			</label>
			<label>
				Temporary password
				<input
					v-model="newAdmin.password"
					autocomplete="new-password"
					maxlength="128"
					minlength="12"
					required
					type="password"
				/>
			</label>
			<label>
				<input v-model="newAdmin.editAdmins" type="checkbox" />
				Grant admin-management privilege
			</label>
			<button class="btn-primary btn" type="submit">Create admin</button>
		</form>

		<div v-for="admin in admins" :key="admin._id" class="tutorList mt-2">
			<ul>
				<li><strong>Name:</strong> {{ admin.name }}</li>
				<li><strong>Email:</strong> {{ admin.email }}</li>
				<li>
					<strong>Admin manager:</strong>
					{{ admin.editAdmins ? "Yes" : "No" }}
				</li>
			</ul>
			<template v-if="currentAdmin?.editAdmins">
				<button
					class="btn-secondary btn"
					type="button"
					@click="setAdminManager(admin._id, !admin.editAdmins)"
				>
					{{ admin.editAdmins ? "Revoke manager" : "Grant manager" }}
				</button>
				<button
					v-if="admin._id !== currentAdmin._id"
					class="btn-danger btn"
					type="button"
					@click="removeAdmin(admin._id)"
				>
					Delete admin
				</button>
			</template>
		</div>

		<!-- ───── Tutors list (read-only) ───── -->
		<hr />
		<h2>Tutors</h2>
		<div v-for="t in tutors" :key="t._id" class="tutorList mt-2">
			<br />
			<ul>
				<ProfileFields
					:editing="false"
					:entity="t"
					:fields="memberFields"
				/>
				<li>Status: {{ t.status }}</li>
			</ul>
			<button
				v-if="currentAdmin?.editAdmins && t.status !== 'active'"
				class="btn-success btn"
				@click="setTutorStatus(t._id, 'active')"
			>
				Approve
			</button>
			<button
				v-if="currentAdmin?.editAdmins && t.status === 'active'"
				class="btn-warning btn"
				@click="setTutorStatus(t._id, 'suspended')"
			>
				Suspend
			</button>
			<button
				v-if="currentAdmin?.editAdmins"
				class="btn-danger btn"
				type="button"
				@click="removeTutor(t._id)"
			>
				Delete tutor
			</button>
		</div>

		<!-- ───── Users list (read-only) ───── -->
		<hr />
		<h2>Users</h2>
		<div v-for="u in users" :key="u._id" class="tutorList mt-2">
			<br />
			<ul>
				<ProfileFields
					:editing="false"
					:entity="u"
					:fields="memberFields"
				/>
			</ul>
			<button
				class="btn-danger btn"
				type="button"
				@click="removeUser(u._id)"
			>
				Delete user
			</button>
		</div>

		<p v-if="message" class="success" role="status">
			{{ message }}
		</p>
		<p v-if="error" class="error" role="alert">
			{{ error }}
		</p>
	</section>
</template>

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

.admin-create {
	display: grid;
	gap: 0.75rem;
	max-width: 32rem;
	margin: 1rem auto;
	text-align: left;
}

.admin-create label {
	display: grid;
	gap: 0.25rem;
}

.success {
	color: #146c43;
	margin-top: 10px;
}

.error {
	color: red;
	margin-top: 10px;
}
</style>
