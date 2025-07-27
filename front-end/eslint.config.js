// eslint.config.js  – works with ESLint v9+ Flat Config
import antfu from "@antfu/eslint-config"; // ★ factory function
import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";

import tsParser from "@typescript-eslint/parser";
import vuePlugin from "eslint-plugin-vue";

import globals from "globals";
import vueParser from "vue-eslint-parser";

// -------------------------------------------------------
// 1️⃣  Let Antfu produce the baseline Composer
// -------------------------------------------------------
export default antfu({
  /* Antfu options ------------------------------------- */
  root: true,
  unocss: true,
  typescript: true,
  vue: true,
  yaml: true,
  jsonc: false,

  env: { browser: true, es2021: true, node: true },

  stylistic: { indent: "tab", quotes: "double", semi: true, linebreak: "unix" },

  rules: {
    "style/no-multiple-empty-lines": "off",
    "style/no-trailing-spaces": "off"
  },

  ignores: [
    "node_modules/**",
    "dist/**",
    "package-lock.json"
  ],

  formatters: {
    css: true,
    html: true,
    markdown: "prettier"
  }
})
  // -------------------------------------------------------
  // 2️⃣  Append *our* file-specific overrides
  // -------------------------------------------------------
  .append(
    /* Plain JavaScript ---------------------------------- */
    {
      ...js.configs.recommended,
      files: ["**/*.{js,cjs,mjs}"],
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        globals: { ...globals.node }
      }
    },

    /* TypeScript ---------------------------------------- */
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
      rules: {
        // put any TS-only rule tweaks here
      }
    },

    /* Vue SFCs ------------------------------------------ */
    {
      files: ["**/*.vue"],
      languageOptions: {
        parser: vueParser, // entry parser
        parserOptions: {
          parser: tsParser, // <script> uses TS parser
          extraFileExtensions: [".vue"],
          ecmaVersion: "latest",
          sourceType: "module"
        }
      },
      plugins: { vue: vuePlugin },
      rules: {
        "vue/no-unused-vars": "off" // allow <script setup> refs
      }
    },

    /* Config / build scripts in CJS mode ---------------- */
    {
      files: [".eslintrc.{js,cjs}", "vite.config.{js,ts}"],
      languageOptions: { sourceType: "script" },
      env: { node: true }
    }
  );
