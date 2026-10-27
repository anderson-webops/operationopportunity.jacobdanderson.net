<script lang="ts" setup>
import { storeToRefs } from "pinia";
import UserSignup from "@/components/UserSignup.vue";
import { useAppStore } from "@/stores/app";

defineOptions({ name: "SignupPage" });

const { currentUser } = storeToRefs(useAppStore());
</script>

<template>
	<section class="Signup text-center">
		<h1>Signup Under a Tutor</h1>
		<UserSignup v-if="currentUser" />
		<p v-else>Please sign in with a user account to select a tutor.</p>
	</section>
</template>
