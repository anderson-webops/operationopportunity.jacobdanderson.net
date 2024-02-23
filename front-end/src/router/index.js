import { createRouter, createWebHistory } from "vue-router";
import Home from "@/views/Home.vue";
import Signup from "@/views/Signup.vue";
import Supportus from "@/views/Supportus.vue";
import About from "@/views/About.vue";
import Profile from "@/views/Profile";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/signup",
    name: "Signup",
    component: Signup,
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
  {
    path: "/profile",
    name: "Profile",
    component: Profile,
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
