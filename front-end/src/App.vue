<script lang="ts" setup>
import AccountManagement from "./components/AccountManagement.vue";
import TheFooter from "./components/TheFooter.vue";
import TheHeader from "./components/TheHeader.vue";
import { useAppStore } from "./stores/app";

const app = useAppStore();

function showLoginModal() {
  app.setLoginBlock(true);
}

function showSignupModal() {
  app.setSignupBlock(true);
}

// https://github.com/vueuse/head
// you can use this to manipulate the document head in any components,
// they will be rendered correctly in the html results with vite-ssg
useHead({
  title: "Vitesse",
  meta: [
    {
      name: "description",
      content: "Opinionated Vite Starter Template"
    },
    {
      name: "theme-color",
      content: () => (isDark.value ? "#00aba9" : "#ffffff")
    }
  ],
  link: [
    {
      rel: "icon",
      type: "image/svg+xml",
      href: () => (preferredDark.value ? "/favicon-dark.svg" : "/favicon.svg")
    }
  ]
});
</script>

<template>
	<div id="app">
		<!----------------
    -   Navigation   -
    ----------------->

    <TheHeader @login-click="showLoginModal" @signup-click="showSignupModal" />

		<!----------------------------
    -   Login and Signup Forms   -
    ----------------------------->

		<AccountManagement />

		<!-----------------
    -   Router View   -
    ------------------>

    <RouterView />

		<!------------
    -   Footer   -
    ------------->

		<TheFooter />
	</div>
</template>

<style></style>
