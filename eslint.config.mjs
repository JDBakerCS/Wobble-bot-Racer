import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Keep server-side sources eligible for the explicit backend lint targets.
    "!backend/",
    "!backend/**",
    "dist/**",
    ".vinext/**",
    ".wrangler/**",
    ".sites-runtime/**",
    "outputs/**",
    "work/**",
  ]),
  {
    rules: {
      // Vinext supports a custom app root, but this Next rule only discovers
      // root app/ and src/app/ directories.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    files: [
      "frontend/app/**/*.{ts,tsx}",
      "frontend/features/game/canvas/RaceCanvas.tsx",
    ],
    rules: {
      // The renderer consumes server-projected game snapshots whose complete
      // TypeScript model is tracked as a separate UI refactor.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: [
      "frontend/app/page.tsx",
      "frontend/features/game/canvas/RaceCanvas.tsx",
    ],
    rules: {
      // These animation loops intentionally synchronize refs and state with
      // browser clocks. TypeScript and behavior tests remain required.
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
