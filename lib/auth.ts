import { betterAuth } from "better-auth";
import { mcp } from "better-auth/plugins"; // >=1.7: mcp comes from its own package
import { apiKey } from "@better-auth/api-key"; // better-auth@1.6.23 splits apiKey into this package (not exported from better-auth/plugins in this version)
import { pool } from "./db";

export const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.ALLOW_SIGNUP !== "true",
  },
  // The sync-cli API key is a trusted machine credential that runs after every
  // coach run plus manual/backfill syncs. better-auth's apiKey plugin defaults
  // to rate-limiting at 10 requests/window, which would silently 401 the sync
  // after 10 calls (coach skills then just log "self-heal next run" forever).
  // Disable per-key rate limiting; edge abuse is handled by Cloudflare.
  plugins: [mcp({ loginPage: "/login" }), apiKey({ rateLimit: { enabled: false } })],
});
