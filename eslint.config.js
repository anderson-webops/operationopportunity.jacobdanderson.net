// eslint.config.js
// ─────────────────────────────────────────────────────────────────────────────
// Root ESLint configuration for both front-end (browser/Vue) and back-end (Node)
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  root: true,

  // ─── Environments ────────────────────────────────────────────────────────────
  // Enables global vars for both Node and browser (Vue), plus modern ES2021
  env: {
    browser: true,
    node:    true,
    es2021:  true
  },

  // ─── Parser & Core Options ───────────────────────────────────────────────────
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion:      "latest",        // allow modern ECMAScript features
    sourceType:       "module",        // enables ES modules
    extraFileExtensions: [".vue"]      // so <script> blocks get picked up
  },

  // ─── Shared Plugins ─────────────────────────────────────────────────────────
  // TS lint rules, Vue lint rules, and Prettier integration
  plugins: [
    "@typescript-eslint",
    "vue",
    "prettier"
  ],

  // ─── Base “extends” ──────────────────────────────────────────────────────────
  // 1. ESLint’s recommended JS + TS rules
  // 2. Vue3 essentials
  // 3. TypeScript & Prettier integrations
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:vue/vue3-essential",
    "@vue/eslint-config-typescript",
    "plugin:prettier/recommended",
    "prettier"
  ],

  // ─── Shared Rules ────────────────────────────────────────────────────────────
  // Applied everywhere (JS/TS/Vue)
  rules: {
    // console/debug only warn in production
    "no-console":  process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",

    // code style
    indent:           ["error", "tab"],
    "linebreak-style":["error", "unix"],
    quotes:           ["error", "double"],
    semi:             ["error", "always"],

    // show Prettier issues as ESLint errors
    "prettier/prettier": "error"
  },

  // ─── File-specific Overrides ─────────────────────────────────────────────────
  overrides: [

    // 1️⃣ Node-config files (CommonJS scripts)
    {
      files: ["*.cjs", "*.config.js", ".eslintrc.{js,cjs}"],
      env:   { node: true },
      parserOptions: { sourceType: "script" }
    },

    // 2️⃣ Vue single-file components
    {
      files: ["*.vue"],
      rules: {
        // allow unused setup bindings (they may be template-only)
        "vue/no-unused-vars": "off"
      }
    },

    // 3️⃣ TypeScript-only tweaks
    {
      files: ["**/*.ts"],
      // ensure type-aware linting, pick up your tsconfig.json
      parserOptions: {
        project: "./tsconfig.json"
      },
      rules: {
        // (You could add TS-specific rules here…)
      }
    }

  ]

};
