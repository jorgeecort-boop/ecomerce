# Supabase Security Runbook

Project ref: `tzflwwbokrsxfibmqirm`

## What Is Enforced

- Row Level Security is enabled on every Prisma-managed table in `public`.
- Direct table grants for Supabase `anon` and `authenticated` roles are revoked.
- The backend should access data through the server-side Prisma connection.
- Browser access must not query sensitive application tables directly through the Supabase Data API.

## Validation

Run:

```bash
npm run security:verify-rls --workspace packages/db
```

Expected output:

```text
RLS enabled and anon/authenticated grants revoked on all expected public tables.
```

## After Rotating The Database Password

Update `DATABASE_URL` wherever the deployed backend connects to Supabase:

- Local root `.env`
- `apps/api/.env`
- Render dashboard environment variable `DATABASE_URL`
- VPS `.env` if deploying with `deploy-vps.*`
- GitHub Actions secrets if a workflow uses the remote database

Do not commit real database URLs or Supabase access tokens.

## E2E Test User Seeding

The `POST /test-seed/create-user` endpoint provisions Playwright test users
(`vendor-test@ecomerce.com`, `customer-test@ecomerce.com`).

### Security model

- If env var `E2E_SEED_TOKEN` is **unset**, the endpoint returns **404** (not registered as far as the public API is concerned).
- If set, requests must include header `X-E2E-Seed-Token` matching exactly, else **401**.
- The token comparison is timing-safe (`crypto.timingSafeEqual`).
- The endpoint is idempotent — calling it for an existing email returns `created: false` with the existing id.
- Passwords are hashed with `bcrypt` (cost 12), matching `auth.service.ts`.

### Enabling for E2E runs

1. Generate a token: `openssl rand -hex 32`
2. Render dashboard → service `ecomerce-api` → Environment → add `E2E_SEED_TOKEN=<token>`
3. Trigger redeploy
4. From CI or local, set the same value in `BASE_URL`-aware Playwright runs as `process.env.E2E_SEED_TOKEN`
5. Unskip the `.describe.skip` blocks in `apps/web/e2e/authenticated-{checkout,products,store}.spec.ts`

### Disabling

Remove `E2E_SEED_TOKEN` from Render env vars and redeploy. The endpoint will then return 404 to any caller.
