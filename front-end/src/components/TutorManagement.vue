<template>
  <div>
    <!----------------
    -   Login Form   -
    ----------------->

    <!-- The Modal -->
    <div
      v-bind:class="{ showLogin: $root.$data.loginBlock }"
      class="modal loginForm"
    >
      <!-- Modal Content -->
      <form class="modal-content animate" v-on:submit.prevent="addTutor">
        <span
          v-on:click="$root.$data.changeLoginView(false)"
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
          <label for="uname"><b>Username</b></label>
          <input type="text" placeholder="Enter Username" id="uname" required />
          <!--                      v-model="loginEmail"-->

          <label for="psw1"><b>Password</b></label>
          <input type="password" placeholder="Enter Password" id="psw1" />
          <!--          required-->
          <!--            v-model="loginPassword"-->

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
                $root.$data.changeLoginView(false);
                $root.$data.changeSignupView(true);
              "
              >Sign Up</a
            ></span
          >
        </div>

        <div class="container" style="background-color: #f1f1f1">
          <button
            type="button"
            v-on:click="$root.$data.changeLoginView(false)"
            class="cancelbtn"
          >
            Cancel
          </button>
          <span class="psw">Forgot <a href="#">password?</a></span>
        </div>
      </form>
    </div>

    <!-- The Modal (contains the Sign Up form) -->
    <div
      v-bind:class="{ showSignup: $root.$data.signupBlock }"
      class="modal signupForm"
    >
      <!-- Modal Content -->
      <form class="modal-content animate" v-on:submit.prevent="addTutor">
        <span
          v-on:click="$root.$data.changeSignupView(false)"
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
          />
          <!--            required-->

          <label for="psw-repeat"><b>Repeat Password</b></label>
          <input
            type="password"
            placeholder="Repeat Password"
            id="psw-repeat"
            v-model="passwordRepeat"
          />
          <!--            required-->

          <button type="submit" class="signup button">Sign Up</button>
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
              v-on:click="$root.$data.changeSignupView(false)"
              class="cancelbtn"
            >
              Cancel
            </button>
            <span class="account"
              >Already have an account?
              <a
                href="#"
                v-on:click="
                  $root.$data.changeSignupView(false);
                  $root.$data.changeLoginView(true);
                "
                >Login</a
              ></span
            >
          </div>
        </div>
      </form>
    </div>
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
    };
  },
  computed: {},
  created() {},
  methods: {
    async addTutor() {
      try {
        await axios.post("/api/tutors", {
          name: this.name,
          email: this.email,
          age: this.age,
          state: this.state,
          password: this.password,
          passwordRepeat: this.passwordRepeat,
          editTutors: false,
          saveEdit: "Edit",
        });
        this.resetData();
        await this.getTutors();
      } catch (error) {
        await this.$root.$data.sendError(error);
      }
    },
    async getTutors() {
      try {
        const response = await axios.get("/api/tutors");
        this.$root.$data.tutors = response.data;
      } catch (error) {
        await this.$root.$data.sendError(error);
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
  div.signupForm .signupbtn {
    width: 100%;
  }
}
</style>
