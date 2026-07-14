# Personal Coach

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
| `COACH_MEMORY_URL` | sync CLI | Base URL of the Personal Coach server to sync against |
| `COACH_SYNC_API_KEY` | sync CLI | API key (from `create-api-key`) used to authenticate sync pushes/pulls |

## Scripts

```bash
npm test          # run the test suite (vitest, against .env.test)
npm run build     # production build (next build)
npm run sync      # push local docs, pull notes mirror, watermark progress
```

## CLI

A standalone `personal-coach` CLI is available for ingest and read access
(search, notes, context, person history, sync status) without the MCP/OAuth
flow — useful for scripts, cron jobs, or terminal use.

```bash
npm link                              # one-time, from this repo
personal-coach login                  # one-time: prompts for server URL + API key,
                                      # verifies them, and stores them (0600) in
                                      # ~/.config/personal-coach/config.json
personal-coach ingest                 # push career-coach/state/, pull new notes
personal-coach ingest path/to/file.json   # push just one file
personal-coach search "cash management" --topK=5
personal-coach notes list --type=idea
personal-coach notes add "some thought" --type=thought --tags=a,b
personal-coach context week 2026-06-15
personal-coach person "Tom" --since=2026-01-01
personal-coach status
```

Add `--json` to any read command for machine-readable output.

**Authentication.** After `personal-coach login`, credentials persist, so no
secret needs to live in a script or scheduled-routine prompt. `COACH_MEMORY_URL`
and `COACH_SYNC_API_KEY` environment variables still work and take precedence
over the stored login when set (handy for CI or one-off overrides). Non-interactive
login: `personal-coach login --url https://… --key <key>`, or pass the key via the
`COACH_SYNC_API_KEY` env var to keep it out of shell history.

## Production deploy

### Coolify (recommended — one resource, no manual proxy/DB wiring)

`docker-compose.coolify.yml` deploys the app and its pgvector database together as a
single "Docker Compose" resource:

1. In Coolify: **New Resource → Docker Compose**, point it at this repo, and set the
   Compose file path to `docker-compose.coolify.yml`.
2. Set two environment variables in the Coolify UI: `OPENAI_API_KEY` and
   `BETTER_AUTH_SECRET` (`openssl rand -hex 32`). Everything else — the DB
   credentials, the app's public domain and TLS cert — is generated and wired
   automatically via Coolify's `SERVICE_FQDN`/`SERVICE_URL` magic variables.
3. Deploy. The schema applies itself on every container boot (see
   `scripts/docker-entrypoint.mjs`), so there's no separate migrate step.
4. One-time bootstrap: temporarily expose the `db` service's port (or use an SSH
   tunnel to the Coolify host), then from your local checkout run against that
   `DATABASE_URL`:
   ```bash
   ALLOW_SIGNUP=true npm run create-user -- <email> <password>
   npm run create-api-key -- sync-cli
   ```
5. Connect a Claude client to `https://<the-domain-coolify-assigned>/mcp`.

### Any other container host

The plain `Dockerfile` at the repo root also builds a standalone image on its own —
point it at any `pgvector/pgvector` Postgres instance, set the environment variables
above, and front it with your own TLS/reverse-proxy setup (e.g. a Cloudflare
Tunnel). The image still self-migrates on boot, so no separate `npm run migrate`
step is needed; only the one-time user/API-key bootstrap above applies.
