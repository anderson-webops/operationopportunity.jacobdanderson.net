import type { UserModule } from "~/types.ts";
import { library } from "@fortawesome/fontawesome-svg-core";
import {
	faFacebook,
	faGithub,
	faInstagram
} from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import axios from "axios";
import { setupLayouts } from "virtual:generated-layouts";
import { ViteSSG } from "vite-ssg";

import { routes } from "vue-router/auto-routes";
import App from "./App.vue";
import "bootstrap/dist/css/bootstrap.min.css";
// Assuming you have styles defined in these files
// import "uno.css";
// import "@unocss/reset/tailwind.css";
import "./styles/main.css";

// apply once globally
axios.defaults.withCredentials = true;
axios.defaults.baseURL = "/api"; // optional, so you can do axios.get("/users/all") instead of "/api/users/all"

// FontAwesome library setup
library.add(faFacebook, faGithub, faInstagram);

// https://github.com/antfu/vite-ssg
export const createApp = ViteSSG(
	App,
	{
		routes: setupLayouts(routes),
		base: import.meta.env.BASE_URL
	},
	ctx => {
		// ctx is the context where you can add global components or plugins
		ctx.app.component("font-awesome-icon", FontAwesomeIcon);

		// Auto-import and install all modules under `modules/`, if any install all modules under `modules/`
		Object.values(
			import.meta.glob<{
				install: UserModule;
			}>("./modules/*.ts", { eager: true })
		).forEach(i => i.install?.(ctx));
		// ctx.app.use(Previewer)

		// If you had specific plugins like a global error handler, i18n, etc., initialize them here
	}
);
