import type { UserModule } from "~/types.ts";
import { library } from "@fortawesome/fontawesome-svg-core";
import {
	faFacebook,
	faGithub,
	faInstagram
} from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { setupLayouts } from "virtual:generated-layouts";
import { ViteSSG } from "vite-ssg";
import { routes } from "vue-router/auto-routes";

import App from "./App.vue";
import "bootstrap/dist/css/bootstrap.min.css";
// Assuming you have styles defined in these files
// import "@unocss/reset/tailwind.css";
import "./styles/main.css";

// import "uno.css";

async function updateQuote() {
	const url: string =
		"https://quote-garden.herokuapp.com/api/v3/quotes?genre=success&limit=100";
	try {
		const response = await fetch(url);
		const json = await response.json();
		// console.log(json);
		return json;
	} catch (error) {
		console.error(error);
		return {}; // return an empty object or any default value
	}
}

if (!import.meta.env.SSR) {
	updateQuote().then(data => {
		// guard: make sure data looks right
		const quotes = Array.isArray(data?.data) ? data.data : [];
		const random = Math.floor(Math.random() * quotes.length);
		const quote = quotes[random] ?? {
			quoteText: "—",
			quoteAuthor: "Unknown"
		};

		document.getElementById("quotation")!.innerHTML =
			`${quote.quoteText}<br>&emsp;&emsp;&emsp;<span>–${quote.quoteAuthor}</span>`;
	});
}

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
