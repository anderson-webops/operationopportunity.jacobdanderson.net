<template>
	<div id="app">
		<!----------------
    -   Navigation   -
    ----------------->

		<TheHeader @login-click="showLoginModal"
							 @signup-click="showSignupModal" />

		<!----------------------------
    -   Login and Signup Forms   -
    ----------------------------->

		<AccountManagement />

		<!-----------------
    -   Router View   -
    ------------------>

		<router-view />

		<!------------
    -   Footer   -
    ------------->

		<TheFooter />
	</div>
</template>

<script lang="ts" setup>
import { useAppStore } from "@/stores/app";

import TheHeader from "@/components/TheHeader.vue";
import AccountManagement from "@/components/AccountManagement.vue";
import TheFooter from "@/components/TheFooter.vue";

const app = useAppStore();

function showLoginModal() {
	app.setLoginBlock(true);
}

function showSignupModal() {
	app.setSignupBlock(true);
}
</script>

<style>

</style>
