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
          <span class="navbar-toggler-icon"> </span>
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
          <form class="d-flex">
            <input
              aria-label="Search"
              class="form-control me-2"
              placeholder="Search"
              type="search"
            />
            <button class="btn btn-outline-success" type="submit">
              Search
            </button>
          </form>
        </div>
      </div>
    </nav>

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
            <li>©2021 AudioT. All rights reserved.</li>
          </ul>
        </nav>
      </div>

      <div class="parter">
        <br />
        <h2>Programming Partner</h2>
        <br />
        <nav class="footer_nav">
          <ul class="semantic_list">
            <li>Nathaniel Judd</li>
          </ul>
        </nav>
      </div>

      <div class="ip pb-1">
        <p id="ip"></p>
      </div>
    </footer>
  </div>
</template>

<style>
/**************
  *   Default   *
  **************/

html,
body,
div,
span,
applet,
object,
iframe,
h1,
h2,
h3,
h4,
h5,
h6,
p,
blockquote,
pre,
a,
abbr,
acronym,
address,
big,
cite,
code,
del,
dfn,
em,
img,
ins,
kbd,
q,
s,
samp,
small,
strike,
strong,
sub,
sup,
tt,
var,
b,
u,
center,
dl,
dt,
dd,
ol,
ul,
li,
fieldset,
form,
label,
legend,
table,
caption,
tbody,
tfoot,
thead,
tr,
th,
td,
article,
aside,
canvas,
details,
embed,
figure,
figcaption,
footer,
header,
hgroup,
menu,
nav,
output,
ruby,
section,
summary,
time,
mark,
audio,
video {
  margin: 0;
  padding: 0;
  border: 0;
  font-size: 100%;
  font: inherit;
  vertical-align: baseline;
}

/* HTML5 display-role reset for older browsers */
article,
aside,
details,
figcaption,
figure,
footer,
header,
hgroup,
menu,
nav,
section {
  display: block;
}

body {
  line-height: 1;
}

ol,
ul {
  list-style: none;
}

blockquote,
q {
  quotes: none;
}

/*noinspection CssOverwrittenProperties*/
blockquote:before,
blockquote:after,
q:before,
q:after {
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
}

h1,
h2 {
  font-family: Didot, Calibri, Candara, sans-serif;
}

nav {
  font-family: Verdana, Calibri, Candara, sans-serif;
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
  padding-top: 10px;
  width: 100%;
  background-color: rgb(247, 247, 247);
}

footer div {
  width: calc(100% / 3);
}

footer h2 {
  text-transform: uppercase;
  font-size: 19px;
  letter-spacing: 2px;
  font-family: Optima, Tahoma, Trebuchet, Arial, sans-serif;
}

footer ul {
  position: relative;
  left: -19px;
}

footer li {
  font-size: 12px;
  font-family: Arial, "Courier New", sans-serif, serif;
}

/********************
  *	Media Screens   *
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
