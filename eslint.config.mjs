// npm run lint (row 190): the packages' TypeScript in src/, with the rules the store's own code uses
// (<store repo>/eslint.config.mjs: double quotes, semicolons, no console, no any, hooks rules) on typescript-eslint's
// recommended set. The scripts/ folder is Node tooling, not package code: only the recommended JavaScript rules.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

const globals = (names) => Object.fromEntries(names.split(" ").map((name) => [name, "readonly"]));
const NODE = globals("process console URL Buffer fetch AbortSignal performance setTimeout clearTimeout setInterval clearInterval TextDecoder TextEncoder structuredClone");
// the scripts drive a browser (puppeteer): the functions they hand to page.evaluate run in the page
const IN_PAGE = globals("document window self location navigator getComputedStyle PerformanceObserver");

export default tseslint.config(
  { ignores: ["dist*/", ".build/", "releases/", "node_modules/", "docs/"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    // the packages render inside the store's Next.js app (next/link, next/navigation come from it): Next's own rules
    plugins: { "react-hooks": reactHooks, "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      // the store's rules (eslint.config.mjs in the store repo)
      semi: ["error", "always"],
      quotes: ["error", "double", { avoidEscape: true }],
      "no-console": "error",
      "no-debugger": "error",
      "no-var": "error",
      "prefer-const": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/ban-ts-comment": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["scripts/**/*.{mjs,mts}", "*.mjs"],
    extends: [js.configs.recommended],
    languageOptions: { globals: { ...NODE, ...IN_PAGE } },
  },
  // the two checks written in TypeScript (node --experimental-strip-types): parsed as TypeScript
  {
    files: ["scripts/**/*.mts"],
    extends: [...tseslint.configs.recommended],
  }
);
