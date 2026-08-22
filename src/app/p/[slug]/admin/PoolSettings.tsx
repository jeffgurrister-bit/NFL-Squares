"use client";

import { useState } from "react";
import { updatePoolSettings } from "@/app/actions/pools";

type Initial = {
  name: string;
  entryFeePerSquare: number;
  weeklyPrize: number;
  reverseWeeklyPrize: number;
  adjacentPrize: number;
  bonusDigitPrize: number;
  zelleHandle: string;
  venmoHandle: string;
};

export function PoolSettings({ poolId, initial }: { poolId: string; initial: Initial }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    try {
      await updatePoolSettings(poolId, {
        name: form.name,
        entryFeePerSquare: Number(form.entryFeePerSquare),
        weeklyPrize: Number(form.weeklyPrize),
        reverseWeeklyPrize: Number(form.reverseWeeklyPrize),
        adjacentPrize: Number(form.adjacentPrize),
        bonusDigitPrize: Number(form.bonusDigitPrize),
        zelleHandle: form.zelleHandle,
        venmoHandle: form.venmoHandle,
      });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">Pool Settings</h2>
          <p className="mt-0.5 text-sm text-ink/60">
            Edit the pool name, fees, and the Zelle / Venmo handles shown to players when they confirm picks.
          </p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className="btn-secondary">
          {open ? "Close" : "Edit"}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          <Field label="Pool name">
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Entry fee per square ($)">
              <input
                type="number"
                min={0}
                className="input"
                value={form.entryFeePerSquare}
                onChange={(e) => setForm({ ...form, entryFeePerSquare: Number(e.target.value) })}
              />
            </Field>
            <Field label="Weekly prize ($)" hint="Exact winner">
              <input
                type="number"
                min={0}
                className="input"
                value={form.weeklyPrize}
                onChange={(e) => setForm({ ...form, weeklyPrize: Number(e.target.value) })}
              />
            </Field>
            <Field label="Reverse-square prize ($)">
              <input
                type="number"
                min={0}
                className="input"
                value={form.reverseWeeklyPrize}
                onChange={(e) => setForm({ ...form, reverseWeeklyPrize: Number(e.target.value) })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Adjacent-square prize ($ each)"
              hint="Paid to each of the 4 orthogonal neighbors (up/down/left/right) of the exact winner. Set 0 to disable."
            >
              <input
                type="number"
                min={0}
                className="input"
                value={form.adjacentPrize}
                onChange={(e) => setForm({ ...form, adjacentPrize: Number(e.target.value) })}
              />
            </Field>
            <Field
              label="Bonus-digit prize ($/week)"
              hint="Added to a running pot each week; the exact winner claims it if the bonus digit (last digit of season points through the prior week) matches either their winners' or losers' digit. Set 0 to disable."
            >
              <input
                type="number"
                min={0}
                className="input"
                value={form.bonusDigitPrize}
                onChange={(e) => setForm({ ...form, bonusDigitPrize: Number(e.target.value) })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Zelle handle"
              hint="Phone, email, or alias players will use to send entry fee."
            >
              <input
                className="input"
                placeholder="(555) 555-7687 or you@example.com"
                value={form.zelleHandle}
                onChange={(e) => setForm({ ...form, zelleHandle: e.target.value })}
              />
            </Field>
            <Field
              label="Venmo username"
              hint="Without the @. We add it automatically when displayed."
            >
              <input
                className="input"
                placeholder="Jimmie-Perkins"
                value={form.venmoHandle}
                onChange={(e) => setForm({ ...form, venmoHandle: e.target.value })}
              />
            </Field>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={save} disabled={pending} className="btn-primary">
              {pending ? "Saving..." : "Save settings"}
            </button>
            {savedAt && Date.now() - savedAt < 4000 && (
              <span className="text-sm text-forest">Saved.</span>
            )}
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-ink/50">{hint}</p>}
    </div>
  );
}
