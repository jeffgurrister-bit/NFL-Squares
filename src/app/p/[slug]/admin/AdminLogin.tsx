"use client";

import { useState } from "react";
import { adminLogin } from "@/app/actions/auth";

export function AdminLogin() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async (fd) => {
        setPending(true);
        setError(null);
        const res = await adminLogin(fd);
        setPending(false);
        if (!res.ok) setError("Wrong password.");
      }}
      className="card space-y-4"
    >
      <div>
        <h1 className="text-xl font-bold text-ink">Admin Login</h1>
        <p className="mt-1 text-sm text-ink/60">
          Enter the admin password (set via the <code>ADMIN_PASSWORD</code> env var).
        </p>
      </div>
      <input type="password" name="password" required className="input" placeholder="Password" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "..." : "Sign in"}
      </button>
    </form>
  );
}
