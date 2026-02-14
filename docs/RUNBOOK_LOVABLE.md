# Lovable Cloud Runbook — PediScreen AI

## Overview

This runbook covers deployment and operations for PediScreen AI on Lovable Cloud with Supabase.

## Prerequisites

- [ ] Supabase project created
- [ ] Lovable project linked (if using Lovable Cloud)
- [ ] GitHub repo connected

## Environment Variables

### Frontend (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes (for auth) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes (for auth) | Supabase anon/public key |
| `VITE_SUPABASE_FUNCTION_URL` | Optional | Edge Functions base URL |
| `VITE_PEDISCREEN_BACKEND_URL` | Optional | FastAPI backend URL |
| `VITE_API_KEY` | Optional | API key for backend |

### Backend (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_JWT_SECRET` | Yes (for Bearer auth) | JWT secret from Supabase Dashboard |
| `SUPABASE_URL` | Optional | Supabase project URL |
| `API_KEY` | Yes | API key for x-api-key auth |

### Supabase Edge Function Secrets

```bash
supabase secrets set SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

## Deployment Checklist

- [ ] Supabase env vars set (frontend + backend)
- [ ] `lovable.config.js` present
- [ ] `supabase/config.toml` has all functions declared
- [ ] Edge functions deployed: `supabase functions deploy`
- [ ] Auth flows tested (login, signup, protected routes)
- [ ] Database migrations run: `supabase db push`
- [ ] CI/CD passes
- [ ] Full E2E tests pass

## Edge Functions

| Function | verify_jwt | Purpose |
|----------|------------|---------|
| analyze | false | Screening analysis (multipart) |
| list_screenings | false | List screenings |
| get_screening | false | Get single screening |
| health | false | Health check |

To require JWT for protected endpoints, set `verify_jwt = true` in `supabase/config.toml` and pass `Authorization: Bearer <token>` from the frontend.

## Deploy Commands

```bash
# Deploy all Edge Functions
supabase functions deploy

# Run migrations
supabase db push

# Build frontend
npm run build
```

## Troubleshooting

### 401 on Edge Functions

- Ensure `verify_jwt` matches your usage (false for public, true for protected)
- Check `supabase/config.toml` has the function declared
- Redeploy: `supabase functions deploy`

### Auth not working

- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Check Supabase Dashboard > Authentication > Providers (email enabled)
- Disable email confirmation for dev: Auth > Settings > Email

### Backend rejects Bearer token

- Set `SUPABASE_JWT_SECRET` from Supabase Dashboard > API > JWT Secret
- Ensure frontend sends `Authorization: Bearer <access_token>`
