<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore }  from '@/stores/app'

const app        = useAppStore()
const { isLoggedIn } = storeToRefs(app)

function logoutUser() {
	app.logout()
}
</script>

<template>
	<header>
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
						v-if="isLoggedIn"
						class="btn btn-outline-danger"
						@click="logoutUser"
					>
						Logout
					</button>
					<!-- Login Button -->
					<button
						v-else
						class="btn btn-outline-success"
						@click="$emit('login-click')"
					>
						Login
					</button>
					<!-- Signup Button -->
					<button
						v-if="!isLoggedIn"
						class="btn btn-outline-primary"
						@click="$emit('signup-click')"
					>
						Signup
					</button>
				</div>
			</div>
		</nav>
	</header>
</template>

<style scoped>

</style>