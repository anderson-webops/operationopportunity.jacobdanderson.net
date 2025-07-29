// ./eslint.config.js (workspace root)
// ───────────────────────────────────────────────────────────────
// Keeps the monorepo/larger workspace tidy.  All project-specific
// rules live in the per-package flat configs.
// ───────────────────────────────────────────────────────────────

module.exports = {
	/** 🟢  stop ESLint from crawling above this folder */
	root: true,

	/** 🌍  globals that make sense everywhere            */
	env: {
		browser: true,
		node: true,
		es2021: true
	},

	/** 🗂  core parser options (plain modern JS)          */
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module"
	},

	/** 🧩  very slim “extends” chain                     */
	extends: [
		"eslint:recommended",            // basic JS sanity
		"plugin:prettier/recommended"   // ↳ shows Prettier issues as ESLint errors
	],

	/** 📜  rules that truly apply repo-wide              */
	rules: {
		// allow console/debug during dev, warn only in prod
		"no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
		"no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off"
	},

	/** 🚫  ignore patterns common to every sub-project   */
	ignorePatterns: [
		"node_modules/",
		"dist/"
	],

	/** 🎯  overrides just for raw Node build / config files */
	overrides: [
		{
			files: ["*.cjs", "*.config.js"],
			env: { node: true },
			parserOptions: { sourceType: "script" }
		}
	]
};
