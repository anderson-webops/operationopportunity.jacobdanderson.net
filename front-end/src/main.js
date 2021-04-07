import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import axios from "axios";

Vue.config.productionTip = false;

let data = {
  tutors: [],
  allUsers: [],
  users: [],
  currentTutor: "",
  loginBlock: false,
  signupBlock: false,
  profileLink: false,
  showUsers: false,
  changeSignupView(showHide) {
    this.signupBlock = showHide;
  },
  changeLoginView(showHide) {
    this.loginBlock = showHide;
  },
  async sendError(error) {
    await axios.post(`/api/error/${error}`, {
      lineNumber: error.lineNumber,
    });
  },
};

new Vue({
  router,
  data,
  render: (h) => h(App),
}).$mount("#app");
