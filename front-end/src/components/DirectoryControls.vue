<script setup lang="ts">
defineProps<{ label: string; loading: boolean; error: string; next: boolean; previous: boolean }>();
defineEmits<{ search: []; next: []; previous: []; refresh: [] }>();
const query = defineModel<string>({ required: true });
</script>

<template>
	<div class="directory-controls" :aria-label="label">
		<form @submit.prevent="$emit('search')">
			<label>Search {{ label }} <input v-model="query" maxlength="80" type="search" /></label>
			<button type="submit" :disabled="loading">Search</button>
		</form>
		<div>
			<button type="button" :disabled="loading || !previous" @click="$emit('previous')">Previous</button>
			<button type="button" :disabled="loading || !next" @click="$emit('next')">Next</button>
			<button type="button" :disabled="loading" @click="$emit('refresh')">Refresh</button>
		</div>
		<p v-if="loading" role="status">Loading {{ label }}…</p>
		<p v-if="error" role="alert">{{ error }}</p>
	</div>
</template>

<style scoped>
.directory-controls {
	max-width: 32rem;
	margin: 1rem auto;
}
form,
.directory-controls > div {
	display: flex;
	justify-content: center;
	flex-wrap: wrap;
	gap: 0.5rem;
	margin: 0.5rem 0;
}
label {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}
[role="alert"] {
	color: #b02a37;
}
</style>
