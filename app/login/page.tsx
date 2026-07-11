"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-xs">
        <h1 className="text-lg font-semibold tracking-tight mb-6">Personal Coach</h1>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await authClient.signIn.email({ email, password, callbackURL: "/" });
            if (res.error) setError(res.error.message ?? "Sign-in failed");
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit">Sign in</Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </div>
    </div>
  );
}
