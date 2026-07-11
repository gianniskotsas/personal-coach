"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  return (
    <main style={{ maxWidth: 360, margin: "10vh auto", fontFamily: "sans-serif" }}>
      <h1>Coach Memory</h1>
      <form onSubmit={async (e) => {
        e.preventDefault();
        const res = await authClient.signIn.email({ email, password, callbackURL: "/" });
        if (res.error) setError(res.error.message ?? "Sign-in failed");
      }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Email" type="email" style={{ display: "block", width: "100%", margin: "8px 0", padding: 8 }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Password" type="password" style={{ display: "block", width: "100%", margin: "8px 0", padding: 8 }} />
        <button type="submit" style={{ padding: "8px 16px" }}>Sign in</button>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
      </form>
    </main>
  );
}
