import { describe, it, expect, afterAll, vi } from "vitest";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

describe("auth", () => {
  it("creates a user, an api key, and verifies the key", async () => {
    process.env.ALLOW_SIGNUP = "true";
    const email = `t${Date.now()}@test.local`;
    await auth.api.signUpEmail({ body: { email, password: "hunter2hunter2", name: "T" } });
    const [{ id }] = await query<{ id: string }>(`SELECT id FROM "user" WHERE email = $1`, [email]);
    const created = await auth.api.createApiKey({ body: { name: "test", userId: id } });
    const verified = await auth.api.verifyApiKey({ body: { key: created.key } });
    expect(verified.valid).toBe(true);
    const bad = await auth.api.verifyApiKey({ body: { key: "nope" } });
    expect(bad.valid).toBe(false);
  });
});

// Regression guard: production posture (ALLOW_SIGNUP unset) MUST reject signup.
// lib/auth.ts computes disableSignUp at module-import time, so we isolate a
// fresh module instance with the var deleted rather than relying on the process
// env that .env.test sets to "true" for the enabled-signup test above.
describe("signup disabled in production posture", () => {
  const original = process.env.ALLOW_SIGNUP;
  afterAll(() => {
    if (original === undefined) delete process.env.ALLOW_SIGNUP;
    else process.env.ALLOW_SIGNUP = original;
    vi.resetModules();
  });

  it("rejects signUpEmail when ALLOW_SIGNUP is not 'true'", async () => {
    delete process.env.ALLOW_SIGNUP;
    vi.resetModules();
    const { auth: freshAuth } = await import("@/lib/auth");
    await expect(
      freshAuth.api.signUpEmail({
        body: { email: `blocked${Date.now()}@test.local`, password: "hunter2hunter2", name: "X" },
      })
    ).rejects.toThrow();
  });
});
