<script lang="ts" setup>
import type { Tutor } from "@/stores/app";
import { storeToRefs } from "pinia";
import { computed, onScopeDispose, ref, watch } from "vue";
import { api } from "@/api";
import DirectoryControls from "@/components/DirectoryControls.vue";
import { useDirectory } from "@/composables/useDirectory";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import { useAppStore } from "@/stores/app";

const app = useAppStore();
const { currentUser } = storeToRefs(app);
const directory = useDirectory<Tutor>("/tutors", () => Boolean(currentUser.value));
const { items: tutors } = directory;
const selectedTutor = ref<Tutor | null>(null);
const saving = ref(false);
let selectionRevision = 0;
const selectedTutorId = computed({
	get: () => selectedTutor.value?._id ?? null,
	set: (id: string | null) => {
		selectionRevision++;
		selectedTutor.value =
			tutors.value.find((tutor) => tutor._id === id) ??
			(selectedTutor.value?._id === id ? selectedTutor.value : null);
	}
});
const error = ref("");
const message = ref("");
useUnsavedChanges(
	() =>
		saving.value ||
		Boolean(currentUser.value && selectedTutor.value && selectedTutor.value._id !== currentUser.value.tutor)
);

let selectionRequest: AbortController | undefined;
watch(
	() => [currentUser.value?._id, currentUser.value?.tutor, app.sessionRevision],
	async () => {
		selectionRequest?.abort();
		const revision = ++selectionRevision;
		selectedTutor.value = null;
		const id = currentUser.value?.tutor;
		if (!id) return;
		const controller = new AbortController();
		selectionRequest = controller;
		try {
			const { data } = await api.get("/tutors", { params: { pageSize: 1, id }, signal: controller.signal });
			if (!controller.signal.aborted && revision === selectionRevision && data.items?.length === 1)
				selectedTutor.value = data.items[0];
		} catch (caught: any) {
			if (caught.code !== "ERR_CANCELED" && !controller.signal.aborted && revision === selectionRevision)
				error.value = "Current tutor details could not be loaded. Your assignment has not changed.";
		}
	},
	{ immediate: true }
);
onScopeDispose(() => selectionRequest?.abort());

async function selectTutor() {
	if (!currentUser.value || !selectedTutor.value || saving.value) return;
	saving.value = true;
	error.value = "";
	message.value = "";
	try {
		const { data } = await api.put(`/users/tutor/${currentUser.value._id}/${selectedTutor.value._id}`);
		app.setCurrentUser(data.currentUser);
		message.value = "Tutor selection saved.";
	} catch (caught: any) {
		error.value = `Error: ${caught.response?.data?.message ?? caught.message}`;
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<section>
		<DirectoryControls
			v-if="currentUser"
			v-model="directory.query.value"
			label="tutors"
			:loading="directory.loading.value"
			:error="directory.error.value"
			:next="Boolean(directory.nextCursor.value)"
			:previous="Boolean(directory.previousCursor.value)"
			@search="directory.search"
			@next="directory.next"
			@previous="directory.previous"
			@refresh="directory.refresh"
		/>
		<form v-if="currentUser && (tutors.length || selectedTutor)" @submit.prevent="selectTutor">
			<label for="tutorSelect">Choose a tutor</label>
			<select id="tutorSelect" v-model="selectedTutorId" :disabled="saving" required>
				<option :value="null" disabled>Select a tutor</option>
				<option
					v-if="selectedTutor && !tutors.some((t) => t._id === selectedTutor?._id)"
					:value="selectedTutor._id"
				>
					{{ selectedTutor.name }} (selected)
				</option>
				<option v-for="tutor in tutors" :key="tutor._id" :value="tutor._id">
					{{ tutor.name }}<template v-if="tutor.state"> — {{ tutor.state }}</template>
				</option>
			</select>
			<button class="mt-3" type="submit" :disabled="saving || !selectedTutor">Save tutor selection</button>
		</form>
		<p v-else-if="currentUser && !directory.loading.value && !directory.error.value">
			No matching tutors. Try another search.
		</p>
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
