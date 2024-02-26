import { createRouter, createWebHistory } from "vue-router";
import Home from "@/views/HomePage.vue";
import Signup from "@/views/SignupPage.vue";
import Supportus from "@/views/SupportUsPage.vue";
import About from "@/views/AboutPage.vue";
import Profile from "@/views/ProfilePage.vue";

const routes = [
	{
		path: "/",
		name: "Home",
		component: Home
	},
	{
		path: "/signup",
		name: "Signup",
		component: Signup
	},
	{
		path: "/supportus",
		name: "Supportus",
		component: Supportus
	},
	{
		path: "/about",
		name: "About",
		component: About
	},
	{
		path: "/profile",
		name: "Profile",
		component: Profile
	}
];

const router = createRouter({
	history: createWebHistory(process.env.BASE_URL),
	routes
});

export default router;
