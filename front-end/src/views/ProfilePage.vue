<template>
	<div>
		<AdminProfile v-if="admin" />
		<TutorProfile v-else-if="tutor" />
		<UserProfile v-else-if="user" />
		<div v-else class="loginSignup">
			<h3>Please login or signup!</h3>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "vuex";

import AdminProfile from "@/components/AdminProfile.vue";
import TutorProfile from "@/components/TutorProfile.vue";
import UserProfile  from "@/components/UserProfile.vue";

defineOptions({ name: "ProfilePage" });

const store = useStore();

const admin = computed(() => store.state.currentAdmin);
const tutor = computed(() => store.state.currentTutor);
const user  = computed(() => store.state.currentUser);
</script>

<style scoped>
div.loginSignup {
	text-align: center;
}

div {
	margin: 22% 0;
}
</style>
