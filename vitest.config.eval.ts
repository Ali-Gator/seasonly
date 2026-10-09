import { defineConfig } from "vitest/config";

// The AI-specific gate, in CI with no photos: the manifest is well-formed, and the committed
// evals/results.json matches the committed inputs and is no worse than evals/baseline.json.
// `pnpm eval:run` refreshes the results locally; see evals/README.md.
export default defineConfig({
  test: {
    environment: "node",
    include: ["evals/**/*.eval.ts"],
  },
});
