<script lang="ts" setup>
import type { Admin, Tutor, User } from "@/stores/app";
import { computed } from "vue";

type Displayable = string | number | boolean | null | undefined;

interface Field {
	key: string;
	label: string;
}

type Entity = Record<string, Displayable> | Admin | Tutor | User;

const props = defineProps<{
	fields: Field[];
	entity: Entity;
	editing: boolean;
}>();

const emit = defineEmits<{
	(e: "update", key: string, value: Displayable): void;
}>();

const entityValues = computed<Record<string, Displayable>>(
	() => props.entity as Record<string, Displayable>
);

function onInput(key: string, value: Displayable) {
	emit("update", key, value);
}
</script>

<template>
	<template v-for="f in fields" :key="f.key">
		<li v-if="editing">
			<label>
				{{ f.label }}:&ensp;
				<input
					:value="entityValues[f.key]"
					class="editTutor"
					type="text"
					@input="
						onInput(
							f.key,
							($event.target as HTMLInputElement).value
						)
					"
				/>
			</label>
		</li>

		<li v-else>
			<strong v-if="false">{{ f.label }}</strong>
			<!-- hidden label → keeps spacing -->
			&ensp;
			<p class="d-inline">
				{{ entityValues[f.key] }}
			</p>
		</li>
	</template>
</template>

<style scoped></style>
