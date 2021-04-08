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
                >Support Us</router-link
              >
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/about">About</router-link>
            </li>
            <li
              v-bind:class="{ showProfile: ($root.$data.tutors.length > 0) }"
              class="nav-item hidden"
            >
              <router-link class="nav-link" to="/profile">Profile</router-link>
            </li>
          </ul>
          <!-- Button to open the modal login form -->
          <button
            class="btn btn-outline-success"
            type="submit"
            v-on:click="$root.$data.changeLoginView(true)"
          >
            Login
          </button>
          <!-- Button to open the modal signup form -->
          <button
            class="btn btn-outline-primary"
            type="submit"
            v-on:click="$root.$data.changeSignupView(true)"
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
                  src="../public/Images/github-dark.09072337.svg"
                  alt="github Icon"
              /></a>
              <!--              <a-->
              <!--                href="https://github.com/Jacoba1100254352/operationopportunity.audiot.info"-->
              <!--                >www.github.com</a-->
              <!--              >-->
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
            <!--            <li>
              ©2021
              <a
                href="http://audiot.info"
                target="_blank"
                style="text-decoration: none; color: inherit"
                ><img
                  id="audiotLogo"
                  src="../public/Images/audiot-logo.png"
                  alt="audiot Icon" /></a
              >. All rights reserved.
            </li>-->
            <!--            <li>
              ©2021
              <a
                href="http://audiot.info"
                target="_blank"
                style="text-decoration: none; color: inherit"
                >Audio<img
                  id="audiotIcon"
                  src="../public/Images/favicon-16x16.png"
                  alt="audiot Icon"
                /> </a
              >. All rights reserved.
            </li>-->
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
// import axios from "axios";
import TutorManagement from "@/components/TutorManagement";

export default {
  name: "App",
  components: { TutorManagement },
  data() {
    return {};
  },
  computed: {
    getUsersArray() {
      return this.$root.$data.users;
    },
    getTutorsArray() {
      return this.$root.$data.tutors;
    },
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

.hidden {
  display: none;
}

.showProfile {
  display: block !important;
}

@media only screen and (min-width: 1px) and (max-width: 960px) {
  body {
    --text_scalar: 0.8;
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

#githubIcon {
  width: 10%;
}

#audiotIcon {
  width: 1.6%;
}

#audiotLogo {
  width: 9%;
  transform: translateY(1px);
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
