import { auth } from "../lib/auth";
import { query } from "../lib/db";
const [name] = process.argv.slice(2);
const users = await query<{ id: string }>(`SELECT id FROM "user" LIMIT 1`);
if (!users.length) { console.error("no user — run create-user first"); process.exit(1); }
const key = await auth.api.createApiKey({ body: { name: name ?? "sync-cli", userId: users[0].id } });
console.log("API key (save it now, shown once):", key.key);
process.exit(0);
