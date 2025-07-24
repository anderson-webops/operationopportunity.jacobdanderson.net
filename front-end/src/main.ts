import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./styles/main.css"; // Import main.css first
import "bootstrap/dist/css/bootstrap.css";
import axios from "axios";
// import "bootstrap-vue/dist/bootstrap-vue.css";

// Include cookies with each transaction by default
axios.defaults.withCredentials = true;

const pinia = createPinia();

createApp(App).use(router).use(pinia).mount("#app");
