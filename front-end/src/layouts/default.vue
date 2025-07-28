<script lang="ts" setup>
import AccountManagement from "~/components/AccountManagement.vue";
import TheHeader from "~/components/TheHeader.vue";
import { useAppStore } from "../stores/app";

const app = useAppStore();

function showLoginModal() {
	app.setLoginBlock(true);
}

function showSignupModal() {
	app.setSignupBlock(true);
}
</script>

<template>
	<main text="center gray-700 dark:gray-200">
		<TheHeader @login-click="showLoginModal" @signup-click="showSignupModal" />
		
		<!----------------------------
    -   Login and Signup Forms   -
    ----------------------------->
		
		<AccountManagement />
		
		<RouterView class="px-4 py-5" />
		<TheFooter />
		<!--    <div mx-auto mt-5 text-center text-sm opacity-50> [Default Layout]
    </div> -->
	</main>
</template>
