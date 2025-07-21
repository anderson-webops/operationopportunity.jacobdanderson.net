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

<script setup lang="ts">
import { ref, provide } from 'vue'
import TheHeader            from '@/components/TheHeader.vue'
import AccountManagement    from '@/components/AccountManagement.vue'
import TheFooter            from '@/components/TheFooter.vue'

const loginBlock  = ref(false)
const signupBlock = ref(false)

// make them available to any child via inject()
provide('loginBlock',  loginBlock)
provide('signupBlock', signupBlock)

function showLoginModal()  { loginBlock.value  = true }
function showSignupModal() { signupBlock.value = true }
</script>

<style>

</style>
