// back-end/eslint.config.js
import js from "@eslint/js";
import ts from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";
import globals from "globals";
import vuePlugin from "eslint-plugin-vue";

/** @type {import("eslint").FlatConfig[]} */
export default [
	// 1️⃣ Base JS
	{
		...js.configs.recommended,
		files: ["**/*.{js,cjs,mjs}"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: { ...globals.node }
		}
	},

	// 2️⃣ TypeScript
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser,
			parserOptions: {
				project: "./tsconfig.json",
				ecmaVersion: "latest",
				sourceType: "module"
			},
			globals: { ...globals.node }
		},
		plugins: { "@typescript-eslint": ts },
		rules: { /* TS-specific rules */ }
	},

	// 3️⃣ Vue SFCs (now using an ES‐imported plugin)
	{
		files: ["**/*.vue"],
		plugins: { vue: vuePlugin },
		rules: {
			"vue/no-unused-vars": "off"
		}
	},

	// 4️⃣ Ignore compiled output
	{
		ignores: ["dist/**"]
	}
];
