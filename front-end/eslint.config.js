// eslint.config.js  – ESLint 9 flat config
import antfu from "@antfu/eslint-config";            // factory ➜ composer   [oai_citation:7‡GitHub](https://github.com/antfu/eslint-config?utm_source=chatgpt.com)
import eslintJs from "@eslint/js";                       // core-JS flat preset  [oai_citation:8‡GitHub](https://github.com/antfu/eslint-config?utm_source=chatgpt.com)
import tseslint from "typescript-eslint";               // meta-pkg w/ flat presets  [oai_citation:9‡GitHub](https://github.com/antfu/eslint-config?utm_source=chatgpt.com)
import vuePlugin from "eslint-plugin-vue";                // v10+ flat presets   [oai_citation:10‡GitHub](https://github.com/antfu/eslint-config?utm_source=chatgpt.com)
import vueParser from "vue-eslint-parser";
import prettierPlugin from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier/flat";      // disables style clashes  [oai_citation:11‡GitHub](https://github.com/francoismassart/eslint-plugin-tailwindcss/issues/325?timeline_page=1&utm_source=chatgpt.com)
import globals from "globals";

export default antfu({
  // ── Antfu baseline ───────────────────────────────────────────────
  root: true,
  env: { browser: true, node: true, es2021: true },
  typescript: true,
  vue: true,
  stylistic: { indent: "tab", quotes: "double", semi: true, linebreak: "unix" },
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off"
  },
  ignores: ["node_modules/**", "dist/**", "package-lock.json"]
})
  // ── Shared presets ────────────────────────────────────────────────
  .append(
    eslintJs.configs.recommended,          // JavaScript fundamentals
    tseslint.configs.recommended,          // Type-aware rules
    ...vuePlugin.configs["flat/essential"] // Vue 3 essentials (array export)
  )
  // ── Project-wide Prettier plugin & harmonised rules ───────────────
  .append({
    plugins: { prettier: prettierPlugin },
    rules: {
      "prettier/prettier": "error",

      /* turn off style rules Prettier already formats */
      "style/indent": "off",
      "style/operator-linebreak": "off",
      "style/comma-dangle": "off",
      "antfu/if-newline": "off",

      /* avoid duplicate unused-var fixers */
      "unused-imports/no-unused-vars": "off"
    }
  })
  // ── File-specific language details ────────────────────────────────
  .append(
    // plain JS / CJS
    {
      files: ["**/*.{js,cjs,mjs}"],
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        globals: globals.node
      }
    },
    // TypeScript
    {
      files: ["**/*.ts"],
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: {
          project: "./tsconfig.json",
          ecmaVersion: "latest",
          sourceType: "module"
        },
        globals: globals.node
      }
    },
    // Vue SFCs
    {
      files: ["**/*.vue"],
      languageOptions: {
        parser: vueParser,
        parserOptions: {
          parser: tseslint.parser,
          extraFileExtensions: [".vue"],
          ecmaVersion: "latest",
          sourceType: "module"
        }
      },
      plugins: { vue: vuePlugin },
      rules: { "vue/no-unused-vars": "off" }
    },
    // Node-style build scripts
    {
      files: ["*.cjs", "*.config.js", ".eslintrc.{js,cjs}", "vite.config.{js,ts}"],
      languageOptions: { sourceType: "script" },
      env: { node: true }
    }
  )
  // ── Prettier conflict resolver – must be last ─────────────────────
  .append(eslintConfigPrettier)            // disables any remaining stylistic rules
