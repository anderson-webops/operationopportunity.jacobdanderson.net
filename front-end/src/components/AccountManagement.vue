<template>
	<div>
		<!----------------
		-   Login Form   -
		----------------->

		<!-- The Login Modal -->
		<div
			class="modal loginForm"
			v-show="loginBlock && !currentTutor"
		>
			<!-- Modal Content -->
			<form class="modal-content animate" @submit.prevent="login">
        <span
					class="close"
					title="Close Modal"
					@click="changeLoginView(false)"
				>&times;</span>

				<div class="imgcontainer">
					<img
						alt="Avatar"
						class="avatar"
						src="https://www.w3schools.com/howto/img_avatar2.png"
					/>
				</div>

				<div class="container">
					<label for="login-email"><b>Email</b></label>
					<input
						id="login-email"
						v-model="loginEmail"
						placeholder="Enter Email"
						required
						type="email"
					/>

					<label for="login-password"><b>Password</b></label>
					<input
						id="login-password"
						v-model="loginPassword"
						placeholder="Enter Password"
						required
						type="password"
					/>

					<button class="button" type="submit">Login</button>
					<label>
						<input
							checked
							name="remember"
							type="checkbox"
						/> Remember me
					</label>
					<span class="signup">
            Don't have an account?
            <button
							type="button"
							@click="toggleSignupModal"
							class="link-button"
						>
              Sign Up
            </button>
          </span>
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

		<!-----------------
		-   Signup Form   -
		------------------>

		<!-- The Signup Modal -->
		<div
			class="modal signupForm"
			v-show="signupBlock && !currentTutor"
		>
			<!-- Modal Content -->
			<form class="modal-content animate" @submit.prevent="addAccount">
        <span
					class="close"
					title="Close Modal"
					@click="changeSignupView(false)"
				>&times;</span>

				<div class="container">
					<h1 class="mb-2">Sign Up</h1>
					<p>
						Please fill in this form to create an account and become a tutor.
					</p>

					<hr />

					<div class="radio">
						<label class="radioLabel" for="tutorChoice">Tutor</label>
						<input
							id="tutorChoice"
							v-model="accountType"
							class="radioInput"
							type="radio"
							value="tutor"
						/>

						<label class="radioLabel" for="userChoice">User</label>
						<input
							id="userChoice"
							v-model="accountType"
							class="radioInput"
							type="radio"
							value="user"
						/>
					</div>

					<hr />

					<label for="signup-name"><b>Name</b></label>
					<input
						id="signup-name"
						v-model="name"
						placeholder="Enter Name"
						required
						type="text"
					/>

					<label for="signup-age"><b>Age</b></label>
					<input
						id="signup-age"
						v-model.number="age"
						placeholder="Enter Age"
						required
						type="number"
						min="0"
					/>

					<label for="signup-state"><b>State</b></label>
					<input
						id="signup-state"
						v-model="state"
						placeholder="Enter State"
						required
						type="text"
					/>

					<label for="signup-email"><b>Email</b></label>
					<input
						id="signup-email"
						v-model="email"
						placeholder="Enter Email"
						required
						type="email"
					/>

					<label for="signup-password"><b>Password</b></label>
					<input
						id="signup-password"
						v-model="password"
						placeholder="Enter Password"
						required
						type="password"
					/>

					<label for="signup-password-repeat"><b>Repeat Password</b></label>
					<input
						id="signup-password-repeat"
						v-model="passwordRepeat"
						placeholder="Repeat Password"
						required
						type="password"
					/>

					<button class="signup button" type="submit">Sign Up</button>
					<p v-if="!passwordMatch" class="passwordMatchError">
						Passwords do not match
					</p>
					<label>
						<input
							checked
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
						<p v-if="errorSignup" class="error">{{ errorSignup }}</p>
						<span class="account">
              Already have an account?
              <button
								type="button"
								@click="toggleLoginModal"
								class="link-button"
							>
                Login
              </button>
            </span>
					</div>
				</div>
			</form>
		</div>
		<p v-if="error" class="error">{{ error }}</p>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from "vue";
import { useStore } from "vuex";
import axios from "axios";

export default defineComponent({
	name: "TutorManagement",
	setup() {
		const store = useStore();

		// Local data properties
		const name = ref<string>("");
		const email = ref<string>("");
		const age = ref<number | null>(null);
		const stateField = ref<string>("");
		const password = ref<string>("");
		const passwordRepeat = ref<string>("");
		const editTutors = ref<boolean>(false);
		const saveEdit = ref<string>("Edit");
		const error = ref<string>("");
		const errorSignup = ref<string>("");
		const errorLogin = ref<string>("");
		const loginEmail = ref<string>("");
		const loginPassword = ref<string>("");
		const accountType = ref<string>("");

		// Computed properties
		const passwordMatch = computed(() => password.value === passwordRepeat.value);

		// Accessing global state from Vuex
		const loginBlock = computed(() => store.state.loginBlock);
		const signupBlock = computed(() => store.state.signupBlock);
		const currentTutor = computed(() => store.state.currentTutor);

		// Toggle Signup Modal
		const toggleSignupModal = () => {
			store.dispatch("changeSignupView", true);
			store.dispatch("changeLoginView", false);
		};

		// Toggle Login Modal
		const toggleLoginModal = () => {
			store.dispatch("changeLoginView", true);
			store.dispatch("changeSignupView", false);
		};

		// Methods
		const addAccount = async () => {
			// Ensure all required fields are filled
			if (
				!name.value ||
				age.value === null ||
				!stateField.value ||
				!email.value ||
				!password.value ||
				!passwordRepeat.value
			) {
				errorSignup.value = "Please fill in all required fields.";
				return;
			}

			// Ensure account type is selected
			if (!accountType.value) {
				errorSignup.value = "Please select an account type.";
				return;
			}

			// Ensure passwords match
			if (!passwordMatch.value) {
				errorSignup.value = "Passwords do not match.";
				return;
			}

			try {
				// Check if email already exists
				await axios.post("/api/accounts", {
					email: email.value,
				});
			} catch (err: any) {
				// Handle error response gracefully
				errorSignup.value = err.response?.data?.message || "An error occurred during signup.";
				return;
			}

			// Create account based on account type
			if (accountType.value === "tutor") {
				try {
					const response = await axios.post("/api/tutors", {
						name: name.value,
						email: email.value,
						age: age.value,
						state: stateField.value,
						password: password.value,
						usersOfTutorLength: 0,
						editTutors: false,
						saveEdit: "Edit",
					});
					store.commit("setCurrentTutor", response.data.currentTutor);
				} catch (err: any) {
					store.commit("setCurrentTutor", null);
					errorSignup.value = err.response?.data?.message || "Failed to create tutor account.";
				}
			} else if (accountType.value === "user") {
				try {
					const response = await axios.post("/api/users", {
						name: name.value,
						age: age.value,
						state: stateField.value,
						email: email.value,
						password: password.value,
						editUsers: false,
						saveEdit: "Edit",
					});
					store.commit("setCurrentUser", response.data.currentUser);
				} catch (err: any) {
					store.commit("setCurrentUser", null);
					errorSignup.value = err.response?.data?.message || "Failed to create user account.";
				}
			} else {
				errorSignup.value = "Invalid account type selected.";
				return;
			}

			// Close signup modal and refresh tutors list
			store.dispatch("changeSignupView", false);
			await getTutors();
			resetData();
		};

		const getTutors = async () => {
			try {
				const response = await axios.get("/api/tutors");
				store.commit("setTutors", response.data);
			} catch (err: any) {
				error.value = err.response?.data?.message || "Failed to fetch tutors.";
			}
		};

		const login = async () => {
			errorLogin.value = "";
			if (!loginEmail.value || !loginPassword.value) {
				errorLogin.value = "Please enter both email and password.";
				return;
			}
			try {
				const response = await axios.post("/api/accounts/login", {
					email: loginEmail.value,
					password: loginPassword.value,
				});
				if (response.data.currentTutor) {
					store.commit("setCurrentTutor", response.data.currentTutor);
				}
				if (response.data.currentAdmin) {
					store.commit("setCurrentAdmin", response.data.currentAdmin);
				}
				if (response.data.currentUser) {
					store.commit("setCurrentUser", response.data.currentUser);
				}

				// Optionally, ensure only one type of account is active at a time

				resetData();
				store.dispatch("changeLoginView", false);
			} catch (err: any) {
				errorLogin.value = err.response?.data?.message || "Login failed. Please try again.";
				store.commit("setCurrentUser", null);
			}
		};

		const getCurrentAccount = async () => {
			try {
				const tutorResponse = await axios.get("/api/tutors/loggedin");
				store.commit("setCurrentTutor", tutorResponse.data.currentTutor);
			} catch (err: any) {
				store.commit("setCurrentTutor", null);
			}

			try {
				const userResponse = await axios.get("/api/users/loggedin");
				store.commit("setCurrentUser", userResponse.data.currentUser);
			} catch (err: any) {
				store.commit("setCurrentUser", null);
			}

			try {
				const adminResponse = await axios.get("/api/admins/loggedin");
				store.commit("setCurrentAdmin", adminResponse.data.currentAdmin);
			} catch (err: any) {
				store.commit("setCurrentAdmin", null);
			}
		};

		const resetData = () => {
			name.value = "";
			email.value = "";
			age.value = null;
			stateField.value = "";
			password.value = "";
			passwordRepeat.value = "";
			editTutors.value = false;
			saveEdit.value = "Edit";
			error.value = "";
			errorSignup.value = "";
			errorLogin.value = "";
			loginEmail.value = "";
			loginPassword.value = "";
			accountType.value = "";
		};

		const changeSignupView = (showHide: boolean) => {
			store.dispatch("changeSignupView", showHide);
		};

		const changeLoginView = (showHide: boolean) => {
			store.dispatch("changeLoginView", showHide);
		};

		// Initialize current account information on component creation
		getCurrentAccount();

		return {
			// Local data
			name,
			email,
			age,
			state: stateField,
			password,
			passwordRepeat,
			editTutors,
			saveEdit,
			error,
			errorSignup,
			errorLogin,
			loginEmail,
			loginPassword,
			accountType,

			// Computed properties
			passwordMatch,

			// Global state from Vuex
			loginBlock,
			signupBlock,
			currentTutor,

			// Methods
			addAccount,
			getTutors,
			login,
			resetData,
			changeSignupView,
			changeLoginView,
			toggleSignupModal,
			toggleLoginModal,
		};
	},
});
</script>

<style scoped>
/*****************************
*   Login and Signup Forms   *
*****************************/

/* The Modal (background) */
.modal {
	display: none; /* Hidden by default */
	position: fixed; /* Stay in place */
	z-index: 1; /* Sit on top */
	left: 0;
	top: 0;
	width: 100%; /* Full width */
	height: 100%; /* Full height */
	overflow: auto; /* Enable scroll if needed */
	background-color: rgba(0, 0, 0, 0.4); /* Black w/ opacity */
	padding-top: 50px;
}

/* Modal Content/Box */
.modal-content {
	background-color: #fefefe;
	border: 1px solid #888;
	width: 80%; /* Could be more or less, depending on screen size */
	margin: auto; /* Centered */
}

/* Show Signup Modal */
.showSignup {
	display: block !important;
}

/* Show Login Modal */
.showLogin {
	display: block !important;
}

/* Common styles for close buttons */
.modal .close {
	position: absolute;
	right: 3%;
	top: 3%;
	color: #dc3545;
	font-size: 35px;
	font-weight: bold;
	cursor: pointer;
}

.modal .close:hover,
.modal .close:focus {
	color: #f44336; /* Darker red */
}

/* Avatar image */
.imgcontainer img.avatar {
	width: 25% !important;
	border-radius: 50%;
}

/* Full-width input fields */
.container input[type="email"],
.container input[type="password"],
.container input[type="text"],
.container input[type="number"] {
	width: 100%;
	padding: 12px 20px;
	margin: 8px 0;
	display: inline-block;
	border: 1px solid #ccc;
	box-sizing: border-box;
}

.container input[type="email"]:focus,
.container input[type="password"]:focus,
.container input[type="text"]:focus,
.container input[type="number"]:focus {
	background-color: #ddd;
	outline: none;
}

/* Add a hover effect for buttons */
.button:hover,
.cancelbtn:hover,
.signup.button:hover,
.link-button:hover {
	opacity: 0.8;
}

/* Style the signup and login buttons */
.button,
.signup.button {
	background-color: #4caf50;
	color: white;
	padding: 14px 20px;
	margin: 8px 0;
	border: none;
	cursor: pointer;
	width: 100%;
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

/* Password match error styling */
.passwordMatchError {
	color: red;
	font-weight: bold;
	margin-top: -10px;
}

/* Login error styling */
.loginError {
	color: red;
	margin-left: 24%;
}

/* Signup error styling */
.errorSignup {
	color: red;
	margin-top: 10px;
}

/* General error styling */
.error {
	color: red;
	text-align: center;
	margin-top: 10px;
}

/* Radio button container */
.radio {
	margin: 0 15%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.radioLabel {
	font-size: 18px;
	margin: 0 10px;
}

.radioInput {
	margin-right: 5px;
}

/* Disclaimer styling */
.disclamer {
	font-size: 12px;
	color: #555;
	text-align: center;
}

/* Account link styling */
.account {
	float: right;
	margin-top: 10px;
}

/* Link button styling to mimic anchor links */
.link-button {
	background: none;
	border: none;
	color: dodgerblue;
	text-decoration: underline;
	cursor: pointer;
	padding: 0;
	font: inherit;
}

/* Responsive Design */
@media screen and (max-width: 300px) {
	.modal-content {
		width: 95%;
	}

	.loginForm .cancelbtn,
	.signupForm .cancelbtn {
		width: 100%;
	}

	.radio {
		flex-direction: column;
	}

	.radioLabel {
		margin: 5px 0;
	}
}
</style>
