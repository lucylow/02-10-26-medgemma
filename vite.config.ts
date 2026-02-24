import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  root: ".",
  // Always build assets at the domain root so Lovable SPA routing works reliably.
  // Using an env-based base here can break script URLs on Lovable.
  base: "/",
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
