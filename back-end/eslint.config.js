// back-end/eslint.config.js
import globals from "globals";
import ts from "typescript-eslint";
import base from "../eslint.config.js";

export default base.append(
	// Node-only TypeScript / JS overrides
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: ts.parser,
			parserOptions: { project: "./tsconfig.json" },
			globals: { ...globals.node }
		},
		rules: {
			"new-cap": "off"
		}
	},
	{
		files: ["**/*.{js,cjs,mjs}"],
		languageOptions: { globals: { ...globals.node } }
	},
	{
		ignores: ["dist/**"]
	}
);
