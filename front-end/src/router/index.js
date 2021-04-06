import Vue from "vue";
import VueRouter from "vue-router";
import Home from "../views/Home.vue";
import Tutor from "../views/Tutor.vue";
import Supportus from "../views/Supportus.vue";
import About from "../views/About.vue";

Vue.use(VueRouter);

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/tutor",
    name: "Tutor",
    component: Tutor,
  },
  {
    path: "/supportus",
    name: "Supportus",
    component: Supportus,
  },
  {
    path: "/about",
    name: "About",
    component: About,
  },
];

const router = new VueRouter({
  mode: "history",
  base: process.env.BASE_URL,
  routes,
});

export default router;
