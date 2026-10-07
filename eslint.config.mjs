// Regulile ESLint: setul Next.js (core-web-vitals și TypeScript) și două reguli oprite (img simplu permis; setState în efecte permis).
// Folderele generate (out, android, ios, functions/lib) sunt ignorate.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@next/next/no-img-element": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "android/**",
    "ios/**",
    "functions/lib/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
