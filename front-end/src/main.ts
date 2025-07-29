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
// Assuming you have styles defined in these files
import "@unocss/reset/tailwind.css";
import "./styles/main.css";
import "uno.css";

async function updateQuote() {
	const url = ""; // "https://quote-garden.herokuapp.com/api/v3/quotes?genre=success&limit=100";
	try {
		const response = await fetch(url);
		const json = await response.json();
		console.log(json);
		return json;
	} catch (error) {
		console.error(error);
		return {}; // return an empty object or any default value
	}
}

updateQuote().then(data => {
	const random = Math.floor(Math.random() * 99);
	const quote = data.data[random];
	let results = "";
	results += quote.quoteText;
	results += "<br>";
	results += `&emsp;&emsp;&emsp;<span>-${quote.quoteAuthor}</span>`;
	document.getElementById("quotation").innerHTML = results;
});

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
