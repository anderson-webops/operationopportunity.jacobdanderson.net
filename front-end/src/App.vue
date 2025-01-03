<template>
	<div id="app">
		<!----------------
    -   Navigation   -
    ----------------->

		<nav
			class="navbar navbar-expand-lg navbar-light"
			style="background-color: #e3f2fd"
		>
			<div class="container-fluid">
				<router-link
					aria-current="page"
					class="nav-item navbar-brand nav-link"
					to="/"
				>
					Operation Opportunity
				</router-link>
				<button
					aria-controls="navbarSupportedContent"
					aria-expanded="false"
					aria-label="Toggle navigation"
					class="navbar-toggler"
					data-bs-target="#navbarSupportedContent"
					data-bs-toggle="collapse"
					type="button"
				>
					<span class="navbar-toggler-icon"></span>
				</button>
				<div id="navbarSupportedContent" class="collapse navbar-collapse">
					<ul class="nav navbar-nav me-auto mb-2 mb-lg-0">
						<li class="nav-item">
							<router-link class="nav-link" to="/">Home</router-link>
						</li>
						<li class="nav-item">
							<router-link class="nav-link" to="/signup">Signup</router-link>
						</li>
						<li class="nav-item">
							<router-link class="nav-link" to="/supportus"
								>Support Us
							</router-link>
						</li>
						<li class="nav-item">
							<router-link class="nav-link" to="/about">About</router-link>
						</li>
						<li class="nav-item">
							<router-link class="nav-link" to="/profile">Profile</router-link>
						</li>
					</ul>
					<!-- Logout Button -->
					<button
						v-if="loggedIn"
						class="btn btn-outline-danger"
						@click="logoutUser"
					>
						Logout
					</button>
					<!-- Login Button -->
					<button
						v-else
						class="btn btn-outline-success"
						@click="showLoginModal"
					>
						Login
					</button>
					<!-- Signup Button -->
					<button
						v-if="!loggedIn"
						class="btn btn-outline-primary"
						@click="showSignupModal"
					>
						Signup
					</button>
				</div>
			</div>
		</nav>

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

		<footer class="text-center">
			<div class="github">
				<br />
				<h2>Github</h2>
				<br />
				<nav class="footer_nav">
					<ul class="semantic_list">
						<li>
							<a
								href="https://github.com/Jacoba1100254352/operationopportunity.audiot.info"
								target="_blank"
								><img
									id="githubIcon"
									alt="github Icon"
									src="../public/Images/github-dark.09072337.svg"
							/></a>
						</li>
					</ul>
				</nav>
			</div>

			<div class="Logo_and_rights">
				<br />
				<h2>AudioT.info</h2>
				<br />
				<nav class="footer_nav">
					<ul class="semantic_list">
						<li>Provo, UT, USA</li>
						<li>
							©2021
							<a
								href="https://audiot.info"
								style="text-decoration: none; color: inherit"
								target="_blank"
								>AudioT</a
							>. All rights reserved.
						</li>
					</ul>
				</nav>
			</div>

			<div class="parter">
				<br />
				<h2></h2>
				<br />
				<nav class="footer_nav">
					<ul class="semantic_list">
						<li>
							<a
								href=""
								style="text-decoration: none; color: inherit"
								target="_blank"
								></a
							>
						</li>
					</ul>
					<br />
					<p></p>
				</nav>
			</div>

			<!--			<p v-if="error" class="error">{{ error }}</p>-->

			<div class="ip pb-1">
				<p id="ip"></p>
			</div>
		</footer>
	</div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { useStore } from "vuex";

export default defineComponent({
	name: "App", // Replace with your component name
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
