<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { useAppStore } from "@/stores/app";

const emit = defineEmits<{
	(e: "loginClick"): void;
	(e: "signupClick"): void;
}>();

const app = useAppStore();
const { error, isLoggedIn } = storeToRefs(app);
const logoutPending = ref(false);

async function logoutUser() {
	if (logoutPending.value) return;
	logoutPending.value = true;
	try {
		await app.logout();
	} finally {
		logoutPending.value = false;
	}
}
</script>

<template>
	<header>
		<nav class="site-navbar navbar navbar-expand-lg navbar-light">
			<div class="container-fluid">
				<router-link aria-current="page" class="nav-item navbar-brand nav-link" to="/">
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
					<span class="navbar-toggler-icon" />
				</button>
				<div id="navbarSupportedContent" class="collapse navbar-collapse">
					<ul class="nav navbar-nav mb-lg-0 mb-2 me-auto">
						<li class="nav-item">
							<router-link class="nav-link" to="/"> Home </router-link>
						</li>
						<li class="nav-item">
							<router-link class="nav-link" to="/signup"> Signup </router-link>
						</li>
						<li class="nav-item">
							<router-link class="nav-link" to="/supportus"> Support Us </router-link>
						</li>
						<li class="nav-item">
							<router-link class="nav-link" to="/about"> About </router-link>
						</li>
						<li v-if="isLoggedIn" class="nav-item">
							<router-link class="nav-link" to="/profile"> Profile </router-link>
						</li>
					</ul>
					<!-- Logout Button -->
					<button
						v-if="isLoggedIn"
						:disabled="logoutPending"
						class="btn-outline-danger btn"
						type="button"
						@click="logoutUser"
					>
						{{ logoutPending ? "Signing out…" : "Logout" }}
					</button>
					<p v-if="error" class="logout-error" role="alert">
						{{ error }}
					</p>
					<!-- Login button -->
					<button v-if="!isLoggedIn" class="btn-outline-success btn" @click="emit('loginClick')">
						Login
					</button>
					<!-- Signup button -->
					<button v-if="!isLoggedIn" class="btn-outline-primary btn" @click="emit('signupClick')">
						Signup
					</button>
				</div>
			</div>
		</nav>
	</header>
</template>

<style scoped>
.site-navbar {
	background-color: #e3f2fd;
}

.logout-error {
	margin: 0 0 0 0.75rem;
	color: #842029;
}
</style>
