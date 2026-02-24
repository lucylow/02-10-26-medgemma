module.exports = {
  platform: "lovable",
  functions: {
    directory: "src/api/edge",
    runtime: "edge"
  },
  build: {
    command: "npm run build",
    output: "dist"
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY
  }
};

/**
 * Lovable Cloud: build output is static SPA in dist/.
 * SPA fallback: host must serve index.html for non-file routes.
 * @see https://docs.lovable.dev
 */
