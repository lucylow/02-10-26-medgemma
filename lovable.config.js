/**
 * Lovable Cloud configuration for PediScreen AI
 * Used for Lovable Cloud deployment and build orchestration.
 * @see https://docs.lovable.dev
 *
 * Build: Vite uses vite.config.mjs (root). Output is static SPA in dist/.
 * For client-side routing to work, the host must serve index.html for all
 * non-file routes (SPA fallback).
 */
export default {
  platform: "lovable",
  build: {
    command: "npm run build",
    output: "dist",
  },
  // Supabase Edge Functions live in supabase/functions/
  // Deploy via: supabase functions deploy
  functions: {
    directory: "supabase/functions",
    runtime: "deno",
  },
};
