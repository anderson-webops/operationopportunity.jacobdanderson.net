<template>
	<div id="app">
		<!----------------
    -   Navigation   -
    ----------------->

		<TheHeader />

		<!----------------------------
    -   Login and Signup Forms   -
    ----------------------------->

		<TutorManagement />

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

<script lang="ts">
import { defineComponent, computed } from "vue";
import { useStore } from "vuex";
import TheHeader from "@/components/TheHeader.vue";
import TheFooter from "@/components/TheFooter.vue";

export default defineComponent({
	name: "App",
	components: { TheHeader, TheFooter },
 // Replace with your component name
	setup() {
		const store = useStore();

		const loggedIn = computed(() => store.state.loggedIn);

		const logoutUser = () => {
			store.dispatch("logout");
			// Additional logout logic here if needed
		};

		const showLoginModal = () => {
			// Logic to show login modal
		};

		const showSignupModal = () => {
			// Logic to show signup modal
		};

		return { loggedIn, logoutUser, showLoginModal, showSignupModal };
	}
});
</script>

<style>

</style>
