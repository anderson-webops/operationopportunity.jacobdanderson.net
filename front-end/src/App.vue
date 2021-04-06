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
              <router-link class="nav-link" to="/signup">Sign Up</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/supportus"
                >Support Us</router-link
              >
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/about">About</router-link>
            </li>
          </ul>
          <!-- Button to open the modal login form -->
          <button
            class="btn btn-outline-success"
            type="submit"
            onclick="document.getElementById('id01').style.display='block'"
          >
            Login
          </button>
          <!-- Button to open the modal signup form -->
          <button
            class="btn btn-outline-primary"
            type="submit"
            onclick="document.getElementById('id02').style.display='block'"
          >
            Signup
          </button>
        </div>
      </div>
    </nav>

    <!----------------
    -   Login Form   -
    ----------------->

    <!-- The Modal -->
    <div id="id01" class="modal loginForm">
      <span
        onclick="document.getElementById('id01').style.display='none'"
        class="close"
        title="Close Modal"
        >&times;</span
      >

      <!-- Modal Content -->
      <form class="modal-content animate">
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

          <label for="psw1"><b>Password</b></label>
          <input
            type="password"
            placeholder="Enter Password"
            id="psw1"
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
              onclick="document.getElementById('id01').style.display='none'; document.getElementById('id02').style.display='block'"
              >Sign Up</a
            ></span
          >
        </div>

        <div class="container" style="background-color: #f1f1f1">
          <button
            type="button"
            onclick="document.getElementById('id01').style.display='none'"
            class="cancelbtn"
          >
            Cancel
          </button>
          <span class="psw">Forgot <a href="#">password?</a></span>
        </div>
      </form>
    </div>

    <!-- The Modal (contains the Sign Up form) -->
    <div id="id02" class="modal signupForm">
      <span
        onclick="document.getElementById('id02').style.display='none'"
        class="close"
        title="Close Modal"
        >&times;</span
      >
      <form class="modal-content">
        <div class="container">
          <h1>Sign Up</h1>
          <p>Please fill in this form to create an account.</p>
          <hr />

          <label for="name"><b>Email</b></label>
          <input type="text" placeholder="Enter Name" id="name" required />

          <label for="email"><b>Email</b></label>
          <input type="text" placeholder="Enter Email" id="email" required />

          <label for="psw2"><b>Password</b></label>
          <input
            type="password"
            placeholder="Enter Password"
            id="psw2"
            required
          />

          <label for="psw-repeat"><b>Repeat Password</b></label>
          <input
            type="password"
            placeholder="Repeat Password"
            id="psw-repeat"
            required
          />

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

          <p class="disclamer">
            By creating an account you agree to our
            <a href="#" style="color: dodgerblue">Terms & Privacy</a>.
          </p>

          <div class="container clearfix" style="background-color: #f1f1f1">
            <button
              type="button"
              onclick="document.getElementById('id02').style.display='none'"
              class="cancelbtn"
            >
              Cancel
            </button>
            <span class="account"
              >Already have an account?
              <a
                href="#"
                onclick="document.getElementById('id02').style.display='none'; document.getElementById('id01').style.display='block'"
                >Login</a
              ></span
            >
          </div>
        </div>
      </form>
    </div>

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
                >www.github.com</a
              >
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
                href="http://audiot.info"
                target="_blank"
                style="text-decoration: none; color: inherit"
                >AudioT</a
              >. All rights reserved.
            </li>
          </ul>
        </nav>
      </div>

      <div class="parter">
        <br />
        <h2>Project Partner</h2>
        <br />
        <nav class="footer_nav">
          <ul class="semantic_list">
            <li>
              <a
                href="http://nathanielcs260.com"
                target="_blank"
                style="text-decoration: none; color: inherit"
                >Nathaniel Judd</a
              >
            </li>
          </ul>
        </nav>
      </div>

      <div class="ip pb-1">
        <p id="ip"></p>
      </div>
    </footer>
  </div>
</template>

<script>
export default {
  name: "App",
  components: {},
  data() {
    return {};
  },
  created() {},
  methods: {},
};

// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
  if (event.target === document.getElementById("id01")) {
    document.getElementById("id01").style.display = "none";
  }
  if (event.target === document.getElementById("id02")) {
    document.getElementById("id02").style.display = "none";
  }
};
</script>

<style>
/**************
*   Default   *
**************/

/*noinspection CssOverwrittenProperties*/
html, body, div, span, applet, object, iframe,
h1, h2, h3, h4, h5, h6, p, blockquote, pre,
a, abbr, acronym, address, big, cite, code,
del, dfn, em, img, ins, kbd, q, s, samp,
small, strike, strong, sub, sup, tt, var,
b, u, center,
dl, dt, dd, ol, ul, li,
fieldset, form, label, legend,
table, caption, tbody, tfoot, thead, tr, th, td,
article, aside, canvas, details, embed,
figure, figcaption, footer, header, hgroup,
menu, nav, output, ruby, section, summary,
time, mark, audio, video /* eslint-disable-line */ {
  margin: 0;
  padding: 0;
  border: 0;
  /*font-size: 100%;*/
  /*font: inherit;*/
  vertical-align: baseline;
}

/* HTML5 display-role reset for older browsers */
article, aside, details, figcaption, figure,
footer, header, hgroup, menu, nav, section /* eslint-disable-line */ {
  display: block;
}

body {
  line-height: 1;
}

ol, ul /* eslint-disable-line */ {
  list-style: none;
}

blockquote, q /* eslint-disable-line */ {
  quotes: none;
}

/*noinspection CssOverwrittenProperties*/
blockquote:before, blockquote:after,
q:before, q:after /* eslint-disable-line */ {
  content: "";
  content: none;
}

table {
  border-collapse: collapse;
  border-spacing: 0;
}

/**************
*   General   *
**************/

* {
  box-sizing: border-box;
  font-family: Helvetica, Arial, sans-serif;
}

body {
  background-color: rgb(255, 255, 255);
  /*--common_area_background_color: white;*/

  --size_adjustment: 1.5;
  --text_scalar: 1;
}

h1,
h2 {
  font-family: Didot, Calibri, Candara, sans-serif;
}

nav {
  font-family: Verdana, Calibri, Candara, sans-serif;
}

@media only screen and (min-width: 1px) and (max-width: 960px) {
  body {
    --text_scalar: 0.8;
  }
}

/* General Formats for the Signup and Login Forms */

/* Set a style for all buttons */
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
  width: 40% !important;
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

/*   Modal Formatting for both Signup and Login   */

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
  padding-top: 60px;
}

/* Modal Content/Box */
div.loginForm .modal-content {
  background-color: #fefefe;
  border: 1px solid #888;
  width: 80%; /* Could be more or less, depending on screen size */
}

div.loginForm .modal-content {
  margin: 5px auto; /* 15% from the top and centered */
}

div.signupForm .modal-content {
  margin: 5% auto 15% auto; /* 5% from the top, 15% from the bottom and centered */
}

/* The Close Button (x) */
div.loginForm .close {
  /* Position it in the top right corner outside of the modal */
  position: absolute;
  right: 25px;
  top: 0;
  color: #000;
  font-size: 35px;
  font-weight: bold;
}

div.signupForm .close {
  position: absolute;
  right: 35px;
  top: 15px;
  font-size: 40px;
  font-weight: bold;
  color: #f1f1f1;
}

/* Close button on hover */
.close:hover,
.close:focus {
  color: #f44336; /* was red */
  cursor: pointer;
}

/* Add Zoom Animation */
div.loginForm .animate {
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

/**************
*   Section   *
**************/

section {
  margin: 4% 10%;
}

section h1 {
  font-size: 50px;
  font-weight: bold;
}

section h2 {
  font-size: 35px;
}

section p,
label {
  font-size: 18px;
  text-align: justify;
  font-family: Optima, sans-serif;
}

img {
  width: 50%;
}

/*************
*   Footer   *
*************/

footer {
  display: flex;
  color: grey;
  flex-flow: row wrap;
  padding: 10px;
  width: 100%;
  background-color: rgb(247, 247, 247);
}

footer div {
  width: calc(100% / 3);
}

footer h2 {
  text-transform: uppercase;
  font-size: calc(19px * var(--text_scalar));
  letter-spacing: 2px;
  font-family: Optima, Tahoma, Trebuchet, Arial, sans-serif;
}

footer li {
  font-size: 12px;
  font-family: Arial, "Courier New", sans-serif, serif;
  height: 100%;
}

/********************
*   Media Screens   *
********************/

@media only screen and (min-width: 1px) and (max-width: 960px) {
  section p {
    font-size: 15px;
  }

  img {
    width: 80%;
  }
}
</style>
