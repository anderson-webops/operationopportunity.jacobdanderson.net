import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";
import vuePlugin from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";

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
			parser: tsParser,
			parserOptions: {
				project: "./tsconfig.json",
				ecmaVersion: "latest",
				sourceType: "module"
			},
			globals: { ...globals.node }
		},
		plugins: { "@typescript-eslint": tsPlugin },
		rules: { /* TS-specific rules here */ }
	},

	// 3️⃣ Vue SFCs
	{
		files: ["**/*.vue"],
		// Use the special Vue parser as the entry-point
		languageOptions: {
			parser: vueParser,
			parserOptions: {
				// inside <script> blocks use the TS parser
				parser: tsParser,
				extraFileExtensions: [".vue"],
				ecmaVersion: "latest",
				sourceType: "module"
			}
		},
		plugins: { vue: vuePlugin },
		rules: {
			// allow unused bindings in `<script setup>`
			"vue/no-unused-vars": "off"
		}
	},

	// 4️⃣ Ignore built output
	{
		ignores: ["dist/**"]
	}
];
