import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function getLovableTagger(mode) {
  if (mode !== "development") return null;
  try {
    const { componentTagger } = require("lovable-tagger");
    return componentTagger();
  } catch {
    return null;
  }
}

export default defineConfig(({ mode }) => ({
  root: ".",
  // Lovable deploys from repo root; base is "/" unless host uses a subpath
  base: process.env.VITE_BASE_URL || "/",
  server: {
    host: "::",
    port: 8080,
    strictPort: false,
    hmr: { overlay: false },
  },
  plugins: [react(), getLovableTagger(mode)].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1500,
    sourcemap: false,
  },
}));
