/**
 * Lovable Cloud configuration for PediScreen AI
 * Used for Lovable Cloud deployment and build orchestration.
 * @see https://docs.lovable.dev
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
