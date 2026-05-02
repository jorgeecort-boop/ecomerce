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
