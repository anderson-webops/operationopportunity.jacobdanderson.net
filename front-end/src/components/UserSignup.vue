<script lang="ts" setup>
import type { Tutor } from "@/stores/app";
import { storeToRefs } from "pinia";
import { onMounted, ref } from "vue";
import { api } from "@/api";
import { useAppStore } from "@/stores/app";

const app = useAppStore();
const { tutors, currentUser } = storeToRefs(app);
const selectedTutor = ref<Tutor | null>(null);
const error = ref("");
const message = ref("");

async function loadTutors() {
	await app.fetchTutors();
	selectedTutor.value =
		tutors.value.find((tutor) => tutor._id === currentUser.value?.tutor) || tutors.value[0] || null;
}

async function selectTutor() {
	if (!currentUser.value || !selectedTutor.value) return;
	error.value = "";
	message.value = "";
	try {
		const { data } = await api.put(`/users/tutor/${currentUser.value._id}/${selectedTutor.value._id}`);
		app.setCurrentUser(data.currentUser);
		message.value = "Tutor selection saved.";
	} catch (caught: any) {
		error.value = `Error: ${caught.response?.data?.message ?? caught.message}`;
	}
}

onMounted(() => void loadTutors());
</script>

<template>
	<section>
		<form v-if="currentUser && tutors.length" @submit.prevent="selectTutor">
			<label for="tutorSelect">Choose a tutor</label>
			<select id="tutorSelect" v-model="selectedTutor" required>
				<option v-for="tutor in tutors" :key="tutor._id" :value="tutor">
					{{ tutor.name }}<template v-if="tutor.state"> — {{ tutor.state }}</template>
				</option>
			</select>
			<button class="mt-3" type="submit">Save tutor selection</button>
		</form>
		<p v-else-if="currentUser">No tutors are currently available.</p>
		<p v-if="message" class="success" role="status">{{ message }}</p>
		<p v-if="error" class="error" role="alert">{{ error }}</p>
	</section>
</template>

<style scoped>
form {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
	max-width: 32rem;
	margin: 0 auto;
}

.success {
	color: #146c43;
}

.error {
	color: #b02a37;
}
</style>
