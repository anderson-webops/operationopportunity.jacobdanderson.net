<!-- src/components/AccountManagement.vue -->
<template>
	<div>
		<!----------------
		-   Login Form   -
		----------------->

		<!-- The Modal -->
		<div :class="{ showLogin: loginBlock }" class="modal loginForm">
			<!-- Modal Content -->
			<form class="modal-content animate" @submit.prevent="loginTutor">
				<span class="close" title="Close Modal" @click="changeLoginView(false)">&times;</span>

				<div class="imgcontainer">
					<img
						alt="Avatar"
						class="avatar"
						src="https://www.w3schools.com/howto/img_avatar2.png"
					/>
				</div>

				<div class="container">
					<label for="uname"><b>Email</b></label>
					<input
						id="uname"
						v-model="loginEmail"
						placeholder="Enter Email"
						required
						type="text"
					/>

					<label for="psw1"><b>Password</b></label>
					<input
						id="psw1"
						v-model="loginPassword"
						placeholder="Enter Password"
						required
						type="password"
					/>

					<button class="button" type="submit">Login</button>
					<label>
						<input checked="checked" name="remember" type="checkbox" /> Remember
						me
					</label>
					<span class="signup"
					>Don't have an account?
            <a
							href="#"
							@click="
                changeLoginView(false);
                changeSignupView(true);
              "
						>Sign Up</a
						></span
					>
				</div>

				<div class="container" style="background-color: #f1f1f1">
					<button
						class="cancelbtn"
						type="button"
						@click="changeLoginView(false)"
					>
						Cancel
					</button>
					<p v-if="errorLogin" class="error loginError">{{ errorLogin }}</p>
					<span class="psw">Forgot <a href="#">password?</a></span>
				</div>
			</form>
		</div>

		<!-- The Modal (contains the Sign Up form) -->
		<div :class="{ showSignup: signupBlock }" class="modal signupForm">

			<!-- Modal Content -->
			<form class="modal-content animate" @submit.prevent="addTutor">
				<span class="close" @click="changeSignupView(false)">&times;</span>

				<div class="container">
					<h1 class="mb-2">Sign Up</h1>
					<p>
						Please fill in this form to create an account and become a tutor.
					</p>
					<hr />

					<label for="name"><b>Name</b></label>
					<input
						id="name"
						v-model="name"
						placeholder="Enter Name"
						required
						type="text"
					/>

					<label for="age"><b>Age</b></label>
					<input
						id="age"
						v-model="age"
						placeholder="Enter Age"
						required
						type="text"
					/>

					<label for="state"><b>State</b></label>
					<input
						id="state"
						v-model="state"
						placeholder="Enter State"
						required
						type="text"
					/>

					<label for="email"><b>Email</b></label>
					<input
						id="email"
						v-model="email"
						placeholder="Enter Email"
						required
						type="text"
					/>

					<label for="psw2"><b>Password</b></label>
					<input
						id="psw2"
						v-model="password"
						placeholder="Enter Password"
						required
						type="password"
					/>
					<!--            required-->

					<label for="psw-repeat"><b>Repeat Password</b></label>
					<input
						id="psw-repeat"
						v-model="passwordRepeat"
						placeholder="Repeat Password"
						required
						type="password"
					/>
					<!--            required-->

					<button class="signup button" type="submit">Sign Up</button>
					<p v-if="!passwordMatch" class="passwordMatchError">
						Passwords do not match
					</p>
					<label>
						<input
							checked="checked"
							name="remember"
							style="margin-bottom: 15px"
							type="checkbox"
						/>
						Remember me
					</label>

					<p class="disclamer" style="font-family: Optima, sans-serif">
						By creating an account you agree to our
						<a href="#" style="color: dodgerblue">Terms & Privacy</a>.
					</p>

					<div class="container clearfix" style="background-color: #f1f1f1">
						<button
							class="cancelbtn"
							type="button"
							@click="changeSignupView(false)"
						>
							Cancel
						</button>
						<span class="account"
						>Already have an account?
              <a
								href="#"
								@click="
                  changeSignupView(false);
                  changeLoginView(true);
                "
							>Login</a
							></span
						>
					</div>
				</div>
			</form>
		</div>
		<p v-if="error" class="error">{{ error }}</p>
	</div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "@/stores/app";
import axios from "axios";

const app = useAppStore();
const { loginBlock, signupBlock } = storeToRefs(app);

/* --- local form state --- */
const name = ref("");
const email = ref("");
const age = ref("");
const state = ref("");
const password = ref("");
const passwordRepeat = ref("");
const error = ref<string>("");

const loginEmail = ref("");
const loginPassword = ref("");
const errorLogin = ref<string>("");

const passwordMatch = computed(() => password.value === passwordRepeat.value);

/* --- UI helpers --- */
function changeLoginView(show: boolean) {
	app.setLoginBlock(show);
}

function changeSignupView(show: boolean) {
	app.setSignupBlock(show);
}

function resetData() {
	name.value = "";
	email.value = "";
	age.value = "";
	state.value = "";
	password.value = "";
	passwordRepeat.value = "";
	loginEmail.value = "";
	loginPassword.value = "";
}

/* --- data load --- */
async function getTutors() {
	await app.fetchTutors();
}

/* --- sign-up --- */
async function addTutor() {
	try {
		// 1) call the API and pull out the newly‐created tutor
		const { data } = await axios.post("/api/tutors", {
			name: name.value,
			email: email.value,
			age: age.value,
			state: state.value,
			password: password.value,
			passwordRepeat: passwordRepeat.value,
			usersOfTutorLength: 0,
			editTutors: false,
			saveEdit: "Edit"
		});

		// 2) if it came back, store them in Pinia and close the signup modal
		if (data.currentTutor) {
			app.setCurrentTutor(data.currentTutor);
			changeSignupView(false);
		}

		// 3) clean up your form and reload your tutor list if you still need it
		resetData();
		await getTutors();
	} catch (err: any) {
		error.value = "Error: " + (err.response?.data?.message ?? err.message);
	}
}

/* --- login --- */
async function loginTutor() {
	errorLogin.value = "";
	if (!loginEmail.value || !loginPassword.value) return;

	try {
		const { data } = await axios.post("/api/accounts/login", {
			email: loginEmail.value,
			password: loginPassword.value
		});

		if (data.currentTutor) app.setCurrentTutor(data.currentTutor);
		if (data.currentUser) app.setCurrentUser(data.currentUser);
		if (data.currentAdmin) app.setCurrentAdmin(data.currentAdmin);

		resetData();
		changeLoginView(false);
	} catch (err: any) {
		errorLogin.value = "Login failed: " + (err.response?.data?.message ?? err.message);
	}
}

onMounted(getTutors);
</script>

<style scoped>
/*****************************
*   Login and Signup Forms   *
*****************************/

/* The Modal (background) */
.modal {
	display: none;
	position: fixed;
	z-index: 1;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	overflow: auto;
	background-color: rgba(0, 0, 0, 0.4);
	padding-top: 50px;
}

/* Modal Content/Box */
.modal-content {
	background-color: #fefefe;
	border: 1px solid #888;
	width: 80%;
	margin: auto;
}

.showSignup,
.showLogin {
	display: block !important;
}

div.loginForm span,
div.signupForm span {
	font-family: Optima, sans-serif;
}

/* The Close Button (x) */
.close {
	/* Position it in the top right corner outside of the modal */
	position: absolute;
	right: 3%;
	top: 3%;
	color: #dc3545;
	font-size: 35px;
	font-weight: bold;
}

/* Close button on hover */
.close:hover,
.close:focus {
	color: #f44336;
	cursor: pointer;
}

/* Set a style for login and signup buttons */
.button {
	background-color: #4caf50;
	color: white;
	padding: 14px 20px;
	margin: 8px 0;
	border: none;
	cursor: pointer;
	width: 100%;
	/*opacity: 0.9;*/ /*Optional, was on the signup button*/
}

/* Add padding to containers */
.container {
	padding: 16px;
}

/* Extra style for the cancel button (red) */
.cancelbtn {
	width: auto;
	padding: 10px 18px;
	background-color: #f44336;
}

/* Add Zoom Animation */
.animate {
	-webkit-animation: animatezoom 0.6s;
	animation: animatezoom 0.6s;
}

.passwordMatchError {
	color: red;
	font-weight: bold;
}

p.loginError {
	margin-left: 24%;
}

@-webkit-keyframes animatezoom {
	from {
		-webkit-transform: scale(0);
	}
	to {
		-webkit-transform: scale(1);
	}
}

@keyframes animatezoom {
	from {
		transform: scale(0);
	}
	to {
		transform: scale(1);
	}
}

/*****************
*   Login Form   *
*****************/

/* Bordered form */
div.loginForm form {
	border: 3px solid #f1f1f1;
}

/* Full-width inputs */
div.loginForm input[type="text"],
div.loginForm input[type="password"] {
	width: 100%;
	padding: 12px 20px;
	margin: 8px 0;
	display: inline-block;
	border: 1px solid #ccc;
	box-sizing: border-box;
}

/* Add a hover effect for buttons */
div.loginForm button:hover {
	opacity: 0.8;
}

/* Center the avatar image inside this container */
div.loginForm .imgcontainer {
	text-align: center;
	margin: 24px 0 12px 0;
}

/* Avatar image */
div.loginForm img.avatar {
	width: 25% !important;
	border-radius: 50%;
}

/* The "Forgot password" text */
div.loginForm span.psw {
	float: right;
	padding-top: 16px;
}

div.loginForm span.signup {
	float: right;
	margin-right: 2px;
}

/* Change styles for span and cancel button on extra small screens */
@media screen and (max-width: 300px) {
	div.loginForm span.psw,
	div.loginForm span.signup {
		display: block;
		float: none;
	}

	div.loginForm .cancelbtn {
		width: 100%;
	}
}

/******************
*   Signup Form   *
******************/

/* Full-width input fields */
div.signupForm input[type="text"],
div.signupForm input[type="password"] {
	width: 100%;
	padding: 15px;
	margin: 5px 0 22px 0;
	display: inline-block;
	border: none;
	background: #f1f1f1;
}

div.signupForm input[type="text"]:focus,
div.signupForm input[type="password"]:focus {
	background-color: #ddd;
	outline: none;
}

div.signupForm hr {
	border: 1px solid #f1f1f1;
	margin-bottom: 25px;
}

div.signupForm button:hover {
	opacity: 1;
}

/* Clear floats */
div.signupForm .clearfix::after {
	content: "";
	clear: both;
	display: table;
}

div.signupForm p.disclamer {
	display: inline-block;
	float: right;
}

/* The "All ready have an account" text */
div.signupForm span.account {
	float: right;
	padding-top: 16px;
}

/* Change styles for cancel button and signup button on extra small screens */
@media screen and (max-width: 300px) {
	div.signupForm .cancelbtn,
	div.signupForm {
		width: 100%;
	}
}
</style>
