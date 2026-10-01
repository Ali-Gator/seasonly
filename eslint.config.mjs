import { builtinModules } from "node:module";

import eslint from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import eslintConfigPrettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/.next/", "**/node_modules/", ".agents/", "playwright-report/", "test-results/"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "@next/next": nextPlugin },
    settings: { next: { rootDir: "apps/web/" } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
    },
  },
  // The analysis core is pure: no framework, no platform, no I/O. tsconfig drops the
  // DOM and Node globals; this catches the imports.
  // {@link openspec/specs/architecture-boundaries/spec.md#requirement-the-analysis-core-imports-no-platform-or-framework-code}
  {
    files: ["packages/analysis/**/*.ts"],
    ignores: ["packages/analysis/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react/*",
                "react-dom",
                "react-dom/*",
                "next",
                "next/*",
                "@supabase/*",
                "ai",
                "@ai-sdk/*",
                "node:*",
                ...builtinModules,
              ],
              message:
                "packages/analysis is pure TypeScript: no framework, platform or Node imports. See openspec/specs/architecture-boundaries/spec.md",
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
);
