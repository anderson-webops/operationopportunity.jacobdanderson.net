import Vue from "vue";
import App from "./App.vue";
import router from "./router";

Vue.config.productionTip = false;

let data = {
  tutors: [],
  users: [],
  admins: [],
  currentTutor: null,
  currentUser: null,
  currentAdmin: null,
  loginBlock: false,
  signupBlock: false,
  showUsers: false,
};

new Vue({
  router,
  data,
  render: (h) => h(App),
}).$mount("#app");
