import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import "./styles/main.css"; // Import main.css first
import "bootstrap/dist/css/bootstrap.css";
// import "bootstrap-vue/dist/bootstrap-vue.css";

const data = {
	tutors: [],
	users: [],
	admins: [],
	currentTutor: null,
	currentUser: null,
	currentAdmin: null,
	loginBlock: false,
	signupBlock: false,
	showUsers: false
};

createApp(App).provide("appData", data).use(router).use(store).mount("#app");
