# coach-memory

A personal career-coach memory service. It ingests daily/weekly/quarterly coaching
logs and notes, embeds them into Postgres (pgvector) for hybrid semantic + keyword
search, and exposes that memory to Claude clients over an MCP server behind
BetterAuth (OAuth + API keys). It also serves a small Next.js dashboard (timeline,
search, notes capture, analytics) for browsing the same data directly.

## Prerequisites

- Node.js 22+
- Docker (for the local Postgres/pgvector instance)

## Local setup

1. Start Postgres:
   ```bash
   docker compose up -d
   ```
2. Copy/create `.env.local` with the required env vars (see below).
3. Apply the schema (coach tables + better-auth tables):
   ```bash
   npm run migrate
   ```
4. Create a login user and a sync API key:
   ```bash
   ALLOW_SIGNUP=true npm run create-user -- <email> <password>
   npm run create-api-key -- sync-cli
   ```

## Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | app, migrate, scripts | Postgres connection string |
| `OPENAI_API_KEY` | app | Embeddings for ingest/search |
| `BETTER_AUTH_SECRET` | app | BetterAuth session/token signing secret |
| `BETTER_AUTH_URL` | app | Public base URL BetterAuth issues callbacks against |
| `COACH_MEMORY_URL` | sync CLI | Base URL of the coach-memory server to sync against |
| `COACH_SYNC_API_KEY` | sync CLI | API key (from `create-api-key`) used to authenticate sync pushes/pulls |

## Scripts

```bash
npm test          # run the test suite (vitest, against .env.test)
npm run build     # production build (next build)
npm run sync      # push local docs, pull notes mirror, watermark progress
```

## Production deploy

The `Dockerfile` at the repo root builds a standalone Next.js image ready for any
container host (Coolify, Fly.io, Railway, etc.). Point it at a `pgvector/pgvector`
Postgres instance, set the environment variables above, run `npm run migrate` once
against the target database, then bootstrap a user and sync API key with the
commands in "Local setup". Front it with your own TLS/reverse-proxy setup (e.g. a
Cloudflare Tunnel) and connect a Claude client to `https://<your-host>/mcp`.
