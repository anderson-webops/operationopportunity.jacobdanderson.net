<script lang="ts" setup>

interface Field {
	key: string;
	label: string;
}

defineProps<{
	fields: Field[]
	entity: Record<string, any>
	editing: boolean
}>();
</script>

<template>
	<template v-for="f in fields" :key="f.key">
		<li v-if="editing">
			<label>
				{{ f.label }}:&ensp;
				<input v-model="entity[f.key]" class="editTutor" type="text" />
			</label>
		</li>

		<li v-else>
			<strong v-if="false">{{ f.label }}</strong> <!-- hidden label → keeps spacing -->
			&ensp;<p class="d-inline">{{ entity[f.key] }}</p>
		</li>
	</template>
</template>

<style scoped>

</style>