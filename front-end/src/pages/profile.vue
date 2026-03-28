<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { defineAsyncComponent } from "vue";
import { useAppStore } from "@/stores/app";

defineOptions({ name: "ProfilePage" });

const AdminProfile = defineAsyncComponent(
	() => import("@/components/AdminProfile.vue")
);
const TutorProfile = defineAsyncComponent(
	() => import("@/components/TutorProfile.vue")
);
const UserProfile = defineAsyncComponent(
	() => import("@/components/UserProfile.vue")
);

const { currentAdmin, currentTutor, currentUser } = storeToRefs(useAppStore());
</script>

<template>
	<div>
		<AdminProfile v-if="currentAdmin" />
		<TutorProfile v-else-if="currentTutor" />
		<UserProfile v-else-if="currentUser" />
		<div v-else class="loginSignup">
			<h3>Please login or signup!</h3>
		</div>
	</div>
</template>

<style scoped>
div.loginSignup {
	text-align: center;
}

div {
	margin: 22% 0;
}
</style>
