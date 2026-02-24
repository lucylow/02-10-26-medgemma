import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  root: ".",
  base: process.env.VITE_BASE_URL || "/",
  server: {
    host: "::",
    port: 8080,
    strictPort: false,
    hmr: { overlay: false },
  },
  plugins: [react(), mode === "development" ? componentTagger() : undefined].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1500,
    sourcemap: false,
  },
}));
