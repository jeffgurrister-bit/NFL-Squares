"use client";

import { useState } from "react";
import { joinPool } from "@/app/actions/squares";

export function JoinPoolButton({ poolId }: { poolId: string }) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await joinPool(poolId);
        } finally {
          setPending(false);
        }
      }}
      className="btn-primary"
    >
      {pending ? "Joining..." : "Join pool"}
    </button>
  );
}
