"use client";

import { useState } from "react";
import { createPool } from "../actions/pools";

export function CreatePoolForm() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        Create Pool
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        setPending(true);
        try {
          await createPool(fd);
        } finally {
          setPending(false);
        }
      }}
      className="card w-80 space-y-3"
    >
      <h3 className="text-sm font-bold text-ink">New Pool</h3>
      <div>
        <label className="label">Pool name</label>
        <input name="name" required className="input mt-1" placeholder="Smith Family" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="label">Entry $</label>
          <input name="entryFeePerSquare" type="number" min={0} defaultValue={50} className="input mt-1" />
        </div>
        <div>
          <label className="label">Weekly $</label>
          <input name="weeklyPrize" type="number" min={0} defaultValue={200} className="input mt-1" />
        </div>
        <div>
          <label className="label">Reverse $</label>
          <input name="reverseWeeklyPrize" type="number" min={0} defaultValue={50} className="input mt-1" />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Creating..." : "Create"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
