<template>
  <div>
    <!----------------
    -   Login Form   -
    ----------------->

    <!-- The Modal -->
    <div
      v-bind:class="{
        showLogin: $root.$data.loginBlock && !$root.$data.currentTutor,
      }"
      class="modal loginForm"
    >
      <!-- Modal Content -->
      <form class="modal-content animate" v-on:submit.prevent="login">
        <span
          v-on:click="changeLoginView(false)"
          class="close"
          title="Close Modal"
          >&times;</span
        >

        <div class="imgcontainer">
          <img
            src="https://www.w3schools.com/howto/img_avatar2.png"
            alt="Avatar"
            class="avatar"
          />
        </div>

        <div class="container">
          <label for="uname"><b>Email</b></label>
          <input
            type="text"
            placeholder="Enter Email"
            id="uname"
            v-model="loginEmail"
            required
          />

          <label for="psw1"><b>Password</b></label>
          <input
            type="password"
            placeholder="Enter Password"
            id="psw1"
            v-model="loginPassword"
            required
          />

          <button type="submit" class="button">Login</button>
          <label>
            <input type="checkbox" checked="checked" name="remember" /> Remember
            me
          </label>
          <span class="signup"
            >Don't have an account?
            <a
              href="#"
              v-on:click="
                changeLoginView(false);
                changeSignupView(true);
              "
              >Sign Up</a
            ></span
          >
        </div>

        <div class="container" style="background-color: #f1f1f1">
          <button
            type="button"
            v-on:click="changeLoginView(false)"
            class="cancelbtn"
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

    <!-- The Modal (contains the Sign Up form) -->
    <div
      v-bind:class="{
        showSignup: $root.$data.signupBlock && !$root.$data.currentTutor,
      }"
      class="modal signupForm"
    >
      <!-- Modal Content -->
      <form class="modal-content animate" v-on:submit.prevent="addAccount">
        <span
          v-on:click="changeSignupView(false)"
          class="close"
          title="Close Modal"
          >&times;</span
        >

        <div class="container">
          <h1 class="mb-2">Sign Up</h1>
          <p>
            Please fill in this form to create an account and become a tutor.
          </p>

          <hr />

          <div class="radio">
            <label class="radioLabel" for="tutorChoice">Tutor</label>
            <input
              class="radioInput"
              type="radio"
              id="tutorChoice"
              value="tutor"
              v-model="accountType"
            />

            <label class="radioLabel" for="userChoice">User</label>
            <input
              class="radioInput"
              type="radio"
              id="userChoice"
              value="user"
              v-model="accountType"
            />
          </div>

          <hr />

          <label for="name"><b>Name</b></label>
          <input
            type="text"
            placeholder="Enter Name"
            id="name"
            v-model="name"
            required
          />

          <label for="age"><b>Age</b></label>
          <input
            type="text"
            placeholder="Enter Age"
            id="age"
            v-model="age"
            required
          />

          <label for="state"><b>State</b></label>
          <input
            type="text"
            placeholder="Enter State"
            id="state"
            v-model="state"
            required
          />

          <label for="email"><b>Email</b></label>
          <input
            type="text"
            placeholder="Enter Email"
            id="email"
            v-model="email"
            required
          />

          <label for="psw2"><b>Password</b></label>
          <input
            type="password"
            placeholder="Enter Password"
            id="psw2"
            v-model="password"
            required
          />

          <label for="psw-repeat"><b>Repeat Password</b></label>
          <input
            type="password"
            placeholder="Repeat Password"
            id="psw-repeat"
            v-model="passwordRepeat"
            required
          />

          <button type="submit" class="signup button">Sign Up</button>
          <p v-if="!passwordMatch" class="passwordMatchError">
            Passwords do not match
          </p>
          <label>
            <input
              type="checkbox"
              checked="checked"
              name="remember"
              style="margin-bottom: 15px"
            />
            Remember me
          </label>

          <p class="disclamer" style="font-family: Optima, sans-serif">
            By creating an account you agree to our
            <a href="#" style="color: dodgerblue">Terms & Privacy</a>.
          </p>

          <div class="container clearfix" style="background-color: #f1f1f1">
            <button
              type="button"
              v-on:click="changeSignupView(false)"
              class="cancelbtn"
            >
              Cancel
            </button>
            <p v-if="errorSignup" class="error">{{ errorSignup }}</p>
            <span class="account"
              >Already have an account?
              <a
                href="#"
                v-on:click="
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

<script>
import axios from "axios";

export default {
  name: "tutorManagement",
  data() {
    return {
      name: "",
      email: "",
      age: "",
      state: "",
      password: "",
      passwordRepeat: "",
      editTutors: false,
      saveEdit: "Edit",
      error: "",
      errorSignup: "",
      errorLogin: "",
      loginEmail: "",
      loginPassword: "",
      accountType: "",
    };
  },
  computed: {
    passwordMatch() {
      return this.password === this.passwordRepeat;
    },
  },
  async created() {
    await this.getCurrentAccount();
  },
  methods: {
    async addAccount() {
      if (
        !this.name ||
        !this.age ||
        !this.state ||
        !this.email ||
        !this.password ||
        !this.passwordRepeat
      )
        return;

      try {
        await axios.post("/api/accounts", {
          email: this.email,
        });
      } catch (error) {
        this.errorSignup = "Error: " + error.response.data.message;
      }

      if (this.accountType === "tutor") {
        try {
          let response = await axios.post("/api/tutors", {
            name: this.name,
            email: this.email,
            age: this.age,
            state: this.state,
            password: this.password,
            usersOfTutorLength: 0,
            editTutors: false,
            saveEdit: "Edit",
          });
          this.$root.$data.currentTutor = response.data.currentTutor;
        } catch (error) {
          this.$root.$data.currentTutor = null;
        }
      } else if (this.accountType === "user") {
        try {
          let response = await axios.post(`/api/users`, {
            name: this.name,
            age: this.age,
            state: this.state,
            email: this.email,
            password: this.password,
            editUsers: false,
            saveEdit: "Edit",
          });
          this.$root.$data.currentUser = response.data.currentUser;
        } catch (error) {
          this.$root.$data.currentUser = null;
        }
      } else {
        this.errorSignup = "Please select an account type";
      }

      this.changeSignupView(false);
      await this.getTutors();
      this.resetData();
    },
    async getTutors() {
      try {
        const response = await axios.get("/api/tutors");
        this.$root.$data.tutors = response.data;
      } catch (error) {
        this.error = "Error: " + error.response.data.message;
      }
    },
    async login() {
      this.errorLogin = "";
      if (!this.loginEmail || !this.loginPassword) return;
      try {
        let response = await axios.post("/api/accounts/login", {
          email: this.loginEmail,
          password: this.loginPassword,
        });
        if (response.data.currentTutor != null)
          this.$root.$data.currentTutor = response.data.currentTutor;
        if (response.data.currentAdmin != null)
          this.$root.$data.currentAdmin = response.data.currentAdmin;
        if (response.data.currentUser != null)
          this.$root.$data.currentUser = response.data.currentUser;
        // May want to add checking that there isn't more than one type at a time...

        this.resetData();
        this.changeLoginView(false);
      } catch (error) {
        this.errorLogin = "Error: " + error.response.data.message;
        this.$root.$data.user = null;
      }
    },
    async getCurrentAccount() {
      try {
        let response = await axios.get("/api/tutors/loggedin");
        this.$root.$data.currentTutor = response.data.currentTutor;
      } catch (error) {
        this.$root.$data.currentTutor = null;
      }
      try {
        let response = await axios.get("/api/users/loggedin");
        this.$root.$data.currentUser = response.data.currentUser;
      } catch (error) {
        this.$root.$data.currentUser = null;
      }
      try {
        let response = await axios.get("/api/admins/loggedin");
        this.$root.$data.currentAdmin = response.data.currentAdmin;
      } catch (error) {
        this.$root.$data.currentAdmin = null;
      }
    },
    resetData() {
      this.name = "";
      this.email = "";
      this.age = "";
      this.state = "";
      this.password = "";
      this.passwordRepeat = "";
      this.editTutors = false;
      this.editUsers = false;
      this.error = "";
      this.errorSignup = "";
      this.errorLogin = "";
      this.loginEmail = "";
      this.loginPassword = "";
    },
    changeSignupView(showHide) {
      this.$root.$data.signupBlock = showHide;
    },
    changeLoginView(showHide) {
      this.$root.$data.loginBlock = showHide;
    },
  },
};
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
  margin: auto; /* 15% from the top and centered was login */
  /* margin: auto; 5% auto 15% auto; 5% from the top, 15% from the bottom and centered signup*/
}

.showSignup {
  display: block !important;
}

.showLogin {
  display: block !important;
}

div.loginForm span, div.signupForm span /* eslint-disable-line */ {
  font-family: Optima, sans-serif;
}

div.radio {
  margin: 0 15%;
}

.radioInput {
  margin-right: 2%;
}

.radioLabel {
  font-size: 25px;
  margin-left: 25%;
  margin-right: 5px;
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
  color: #f44336; /* was red */
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
