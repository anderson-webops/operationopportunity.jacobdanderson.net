<script lang="ts" setup>
import type { Admin, Tutor, User } from "@/stores/app";
import { ref, watch } from "vue";
import { api } from "@/api";
import { useAppStore } from "@/stores/app";

type Kind = "admin" | "tutor" | "user";
type Account = Admin | Tutor | User;

const props = defineProps<{
	kind: Kind;
	account: Account;
}>();

const app = useAppStore();
const email = ref(props.account.email ?? "");
const currentPassword = ref("");
const newPassword = ref("");
const passwordConfirmation = ref("");
const error = ref("");
const message = ref("");

watch(
	() => props.account.email,
	(value) => {
		email.value = value ?? "";
	}
);

const endpoint: Record<Kind, (id: string) => string> = {
	admin: (id) => `/admins/${id}`,
	tutor: (id) => `/tutors/${id}`,
	user: (id) => `/users/user/${id}`
};

async function saveCredentials() {
	error.value = "";
	message.value = "";
	const normalizedEmail = email.value.trim().toLowerCase();
	const changesEmail = normalizedEmail !== (props.account.email ?? "");
	const changesPassword = newPassword.value.length > 0;
	if (!changesEmail && !changesPassword) {
		error.value = "Enter a new email or password.";
		return;
	}
	if (changesPassword && newPassword.value !== passwordConfirmation.value) {
		error.value = "New passwords do not match.";
		return;
	}

	try {
		const { data } = await api.put(endpoint[props.kind](props.account._id), {
			currentPassword: currentPassword.value,
			...(changesEmail ? { email: normalizedEmail } : {}),
			...(changesPassword ? { password: newPassword.value } : {})
		});
		const updated =
			props.kind === "admin" ? data.currentAdmin : props.kind === "tutor" ? data.currentTutor : data.currentUser;
		if (props.kind === "admin") app.setCurrentAdmin(updated);
		else if (props.kind === "tutor") app.setCurrentTutor(updated);
		else app.setCurrentUser(updated);
		currentPassword.value = "";
		newPassword.value = "";
		passwordConfirmation.value = "";
		message.value = "Account credentials updated; other sessions were revoked.";
	} catch (caught: any) {
		error.value = caught.response?.data?.message ?? caught.message;
	}
}
</script>

<template>
	<form class="credential-form" @submit.prevent="saveCredentials">
		<h3>Account security</h3>
		<label>
			Email
			<input v-model="email" autocomplete="email" maxlength="254" required type="email" />
		</label>
		<label>
			Current password
			<input v-model="currentPassword" autocomplete="current-password" maxlength="128" required type="password" />
		</label>
		<label>
			New password (optional)
			<input v-model="newPassword" autocomplete="new-password" maxlength="128" minlength="12" type="password" />
		</label>
		<label>
			Repeat new password
			<input
				v-model="passwordConfirmation"
				autocomplete="new-password"
				maxlength="128"
				minlength="12"
				type="password"
			/>
		</label>
		<button class="btn-primary btn" type="submit">Update credentials</button>
		<p v-if="message" class="success" role="status">{{ message }}</p>
		<p v-if="error" class="error" role="alert">{{ error }}</p>
	</form>
</template>

<style scoped>
.credential-form {
	display: grid;
	gap: 0.75rem;
	max-width: 32rem;
	margin: 1.5rem auto;
	text-align: left;
}

.credential-form label {
	display: grid;
	gap: 0.25rem;
}

.success {
	color: #146c43;
}

.error {
	color: #b02a37;
}
</style>
