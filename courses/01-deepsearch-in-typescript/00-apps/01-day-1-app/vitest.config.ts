import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  test: {
    setupFiles: ["dotenv/config"],
    testTimeout: 10_000_000,
    sequence: {
      concurrent: false,
    },
  },
  plugins: [tsconfigPaths()],
});
