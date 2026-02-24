import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "prom-client": path.resolve(__dirname, "./src/test/stubs/prom-client.ts"),
      "@opentelemetry/api": path.resolve(__dirname, "./src/test/stubs/opentelemetry-api.ts"),
      "@wandb/sdk": path.resolve(__dirname, "./src/test/stubs/wandb-sdk.ts"),
    },
  },
});
