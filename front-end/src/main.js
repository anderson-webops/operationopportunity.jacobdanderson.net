import Vue from "vue";
import App from "./App.vue";
import router from "./router";
// import axios from "axios";

Vue.config.productionTip = false;

let data = {
  tutors: [],
  users: [],
  currentTutor: null,
  loginBlock: false,
  signupBlock: false,
  showUsers: false,
  /*  async sendError(error) {
    await axios.post(`/api/error/${error}`, {
      lineNumber: error.lineNumber,
    });
  },*/
};

new Vue({
  router,
  data,
  render: (h) => h(App),
}).$mount("#app");
