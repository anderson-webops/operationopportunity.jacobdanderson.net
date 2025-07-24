import { createRouter, createWebHistory } from "vue-router";
import Home from "@/views/HomePage.vue";
import Signup from "@/views/SignupPage.vue";
import Supportus from "@/views/SupportUsPage.vue";
import About from "@/views/AboutPage.vue";
import Profile from "@/views/ProfilePage.vue";
// import { useAppStore } from "@/stores/app";

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
		component: Profile,
		//meta: { requiresAuth: true }
	}
];

const router = createRouter({
	history: createWebHistory(process.env.BASE_URL),
	routes
});

// Optional guard to prevent accessing /profile without authentication
// router.beforeEach((to, _from, next) => {
// 	if (!to.meta.requiresAuth) return next();
//
// 	const { isLoggedIn } = useAppStore();    // Pinia is fine inside guards
// 	if (isLoggedIn)     next();              // OK – go to /profile
// 	else                next("/");           // or next("/login") if you have a page
// });

export default router;
