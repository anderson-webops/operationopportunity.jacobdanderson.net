import type { App } from "vue";
import type { Router } from "vue-router";

export interface UserModuleContext {
	app: App<Element>;
	router: Router;
}

export type UserModule = (context: UserModuleContext) => void | Promise<void>;
