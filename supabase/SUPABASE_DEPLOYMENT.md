# Supabase Edge Functions Deployment for PediScreen AI

This directory contains Supabase Edge Functions that implement the PediScreen AI backend:

- **POST /analyze** — Accept multipart form-data, analyze, upload image, persist to DB
- **GET /screenings** — List screenings with pagination (`?limit=50&page=0`)
- **GET /screenings/:id** — Get single screening by `screening_id` (use `?id=ps-xxx`)

## Prerequisites

1. [Supabase CLI](https://supabase.com/docs/guides/cli) installed and logged in
2. A Supabase project created (or `supabase init` + `supabase link`)

## 1. Create Storage Bucket

In Supabase Dashboard → Storage:

- Create bucket named **uploads**
- Recommended: **public = false** (use signed URLs for sharing)

## 2. Run SQL Schema

Run the migration in Supabase SQL Editor or via:

```bash
supabase db push
```

Or copy the contents of `supabase/migrations/20250211000000_create_screenings.sql` into the SQL editor and execute.

## 3. Set Secrets

```bash
supabase secrets set SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

Optional (for future model integration):

```bash
supabase secrets set MODEL_API_URL="https://your-model-api.com/analyze"
supabase secrets set MODEL_API_KEY="your-api-key"
```

## 4. Deploy Functions

From the repo root:

```bash
# Deploy all three functions
supabase functions deploy analyze --no-verify-jwt
supabase functions deploy list_screenings --no-verify-jwt
supabase functions deploy get_screening --no-verify-jwt
```

Or if using project ref:

```bash
supabase functions deploy analyze --project-ref YOUR_PROJECT_REF --no-verify-jwt
supabase functions deploy list_screenings --project-ref YOUR_PROJECT_REF --no-verify-jwt
supabase functions deploy get_screening --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

> **Note:** `--no-verify-jwt` makes endpoints publicly callable. For production, remove this flag and pass `Authorization: Bearer <token>` from authenticated clients.

## 5. Local Development

```bash
# Start local Supabase (requires Docker)
supabase start

# Serve functions locally
supabase functions serve analyze
# Or all at once:
supabase functions serve
```

Then POST to `http://127.0.0.1:54321/functions/v1/analyze`

## 6. Test the Analyze Endpoint

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/analyze" \
  -F "childAge=24" \
  -F "domain=language" \
  -F "observations=My 2-year-old says only about 10 words and doesn't combine words" \
  -F "image=@/path/to/sample.jpg"
```

## Frontend Integration

Set `VITE_SUPABASE_FUNCTION_URL` in `.env`:

```
VITE_SUPABASE_FUNCTION_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1
```

The `screeningApi.ts` can be configured to use Supabase when this env var is set (see optional integration in README).

## Security Checklist

- [ ] Keep `SUPABASE_SERVICE_ROLE_KEY` secret — never expose to client
- [ ] Storage bucket `uploads` is private — use signed URLs for sharing
- [ ] Avoid logging PII (child names, IDs)
- [ ] Consider encrypting `report` or sensitive columns at rest
- [ ] Add rate-limiting / abuse protection for production
- [ ] Enable JWT verification on functions if using Supabase Auth
