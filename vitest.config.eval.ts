import { defineConfig } from "vitest/config";

// The AI-specific gate. Phase 0: manifest format only. t6-eval-set adds the
// consistency run over evals/photos/ and its recorded baseline.
export default defineConfig({
  test: {
    environment: "node",
    include: ["evals/**/*.eval.ts"],
  },
});
