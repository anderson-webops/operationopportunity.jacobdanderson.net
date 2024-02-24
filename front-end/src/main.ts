import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

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

createApp(App).provide("appData", data).use(router).mount("#app");
