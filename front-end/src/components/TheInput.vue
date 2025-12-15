<script lang="ts" setup>
const modelValue = defineModel<string>({ default: "" });
</script>

<template>
	<input
		id="input"
		v-model="modelValue"
		class="input-field"
		type="text"
		v-bind="$attrs"
	/>
</template>

<style scoped>
.input-field {
	background: transparent;
	border: 1px solid #e5e7eb;
	border-radius: 6px;
	outline: none;
	padding: 0.5rem 1rem;
	text-align: center;
	width: 250px;
}

.input-field:focus {
	border-color: #9ca3af;
	box-shadow: none;
}
</style>
