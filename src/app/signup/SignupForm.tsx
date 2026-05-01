"use client";

import { useState } from "react";
import { signUpWithCredentials } from "@/app/actions/auth";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      action={async (fd) => {
        setPending(true);
        setError(null);
        const res = await signUpWithCredentials(fd);
        setPending(false);
        if (res?.error) setError(res.error);
      }}
      className="space-y-3"
    >
      <div>
        <label className="label">Display name</label>
        <input
          name="name"
          required
          autoComplete="name"
          className="input mt-1"
          placeholder="Jimmie"
        />
      </div>
      <div>
        <label className="label">Username or email</label>
        <input
          name="username"
          required
          autoComplete="username"
          className="input mt-1"
          placeholder="jimmie or jimmie@gmail.com"
        />
        <p className="mt-1 text-xs text-ink/50">
          Use whatever you&apos;ll remember — your email or a short username are both fine.
        </p>
      </div>
      <div>
        <label className="label">Password</label>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input mt-1"
        />
        <p className="mt-1 text-xs text-ink/50">At least 8 characters.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
