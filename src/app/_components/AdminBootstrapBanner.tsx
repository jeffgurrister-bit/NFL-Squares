"use client";

import { useState } from "react";
import { claimFirstAdmin } from "@/app/actions/auth";

export function AdminBootstrapBanner() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-gold bg-accent-goldSoft p-4 text-sm text-ink">
      <div>
        <p className="font-bold">No admin set up yet.</p>
        <p className="text-xs text-ink/70">
          The admin manages games, randomizes weekly digits, and records payments. Only
          claim this if you&apos;re the one running the pool — you can&apos;t un-claim it later
          without another admin to demote you.
        </p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            await claimFirstAdmin();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed");
          } finally {
            setPending(false);
          }
        }}
        className="btn-primary whitespace-nowrap"
      >
        {pending ? "Claiming..." : "I'm the admin"}
      </button>
    </div>
  );
}
