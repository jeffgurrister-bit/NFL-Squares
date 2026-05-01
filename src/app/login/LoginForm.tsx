"use client";

import { useState } from "react";
import { signInWithCredentials } from "@/app/actions/auth";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      action={async (fd) => {
        setPending(true);
        setError(null);
        const res = await signInWithCredentials(fd);
        setPending(false);
        if (res?.error) setError(res.error);
      }}
      className="space-y-3"
    >
      <div>
        <label className="label">Username</label>
        <input
          name="username"
          required
          autoComplete="username"
          className="input mt-1"
          placeholder="jimmie"
        />
      </div>
      <div>
        <label className="label">Password</label>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="input mt-1"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
