import type { UserModule } from "~/types.ts";
import { library } from "@fortawesome/fontawesome-svg-core";
import {
	faFacebook,
	faGithub,
	faInstagram
} from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { createHead } from "@unhead/vue/client";
import { createPinia } from "pinia";
import { setupLayouts } from "virtual:generated-layouts";
import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import { routes } from "vue-router/auto-routes";
import App from "./App.vue";
import { useAppStore } from "./stores/app";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/main.css";

library.add(faFacebook, faGithub, faInstagram);

const app = createApp(App);
const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: setupLayouts([...routes])
});

app.use(createPinia());
app.use(createHead());
app.use(router);
app.component("font-awesome-icon", FontAwesomeIcon);

const context = { app, router };
let mounted = false;

async function start() {
	for (const module of Object.values(
		import.meta.glob<{ install: UserModule }>("./modules/*.ts", {
			eager: true
		})
	)) {
		await module.install?.(context);
	}

	await router.isReady();
	app.mount("#app");
	mounted = true;
	await Promise.allSettled([
		import("bootstrap"),
		useAppStore().bootstrapSession()
	]);
}

void start().catch((error: unknown) => {
	console.error(
		"Application startup failed",
		error instanceof Error ? error.name : "UnknownError"
	);
	if (!mounted) {
		app.mount("#app");
		mounted = true;
	}
});
