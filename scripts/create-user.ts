import { auth } from "../lib/auth";
const [email, password, name] = process.argv.slice(2);
if (!email || !password) { console.error("usage: create-user <email> <password> [name]"); process.exit(1); }
const res = await auth.api.signUpEmail({ body: { email, password, name: name ?? "Coach" } });
console.log("created user", res.user.id);
process.exit(0);
