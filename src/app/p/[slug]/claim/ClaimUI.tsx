"use client";

import { useState } from "react";
import { Grid, type GridSquare, type GridSelection } from "@/components/Grid";
import { claimSquares, setParticipantColor } from "@/app/actions/squares";

const COLORS = [
  "#fecaca", "#bbf7d0", "#bfdbfe", "#fde68a", "#ddd6fe",
  "#fed7aa", "#a7f3d0", "#fbcfe8", "#c7d2fe", "#fef08a",
];

type Pool = {
  id: string;
  name: string;
  entryFeePerSquare: number;
  zelleHandle: string | null;
  venmoHandle: string | null;
};

type Me = { id: string; name: string; color: string };

export function ClaimUI({
  pool,
  me,
  squares: initialSquares,
}: {
  pool: Pool;
  me: Me | null;
  squares: GridSquare[];
}) {
  const [squares, setSquares] = useState<GridSquare[]>(initialSquares);
  const [selected, setSelected] = useState<GridSelection[]>([]);
  const [color, setColor] = useState<string>(me?.color ?? COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmed, setConfirmed] = useState<{ count: number; total: number } | null>(null);

  function toggleSelect(row: number, col: number) {
    setError(null);
    setSelected((prev) => {
      const key = `${row},${col}`;
      const isPicked = prev.some((p) => `${p.row},${p.col}` === key);
      if (isPicked) return prev.filter((p) => `${p.row},${p.col}` !== key);
      return [...prev, { row, col }];
    });
  }

  async function handleColorChange(newColor: string) {
    setColor(newColor);
    if (!me) return;
    try {
      await setParticipantColor(me.id, newColor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save color");
    }
  }

  async function handleConfirm() {
    if (!me || selected.length === 0) return;
    setError(null);
    setPending(true);
    try {
      const result = await claimSquares(pool.id, selected);
      if (!result.ok) {
        const taken = result.taken.map((t) => `(${t.row + 1},${t.col + 1})`).join(", ");
        setError(`These squares were grabbed by someone else: ${taken}. Refresh and try again.`);
        return;
      }
      // Success: optimistically add to displayed squares; clear selection.
      const newSquares: GridSquare[] = selected.map((s) => ({
        row: s.row,
        col: s.col,
        participantId: me.id,
        participantName: me.name,
        color: me.color,
      }));
      setSquares((prev) => [...prev, ...newSquares]);
      setConfirmed({ count: selected.length, total: selected.length * pool.entryFeePerSquare });
      setSelected([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to confirm picks");
    } finally {
      setPending(false);
    }
  }

  const totalOwed = selected.length * pool.entryFeePerSquare;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <div className="card space-y-3">
          <div>
            <h3 className="text-sm font-bold text-ink">Your picks</h3>
            <p className="mt-0.5 text-xs text-ink/60">
              {me
                ? `Tap empty cells to add or remove them. Confirm when ready.`
                : "Join the pool first."}
            </p>
          </div>

          <div className="rounded-md bg-surface p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-wide text-ink/60">Selected</span>
              <span className="text-2xl font-bold text-ink">{selected.length}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-wide text-ink/60">Total owed</span>
              <span className="text-lg font-bold text-ink">${totalOwed.toLocaleString()}</span>
            </div>
            <p className="mt-2 text-[11px] text-ink/50">
              ${pool.entryFeePerSquare}/square · for the whole season
            </p>
          </div>

          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected([])}
              className="text-xs font-semibold text-ink/60 hover:text-ink"
            >
              Clear all picks
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!me || selected.length === 0 || pending}
            className="btn-primary w-full"
          >
            {pending
              ? "Confirming..."
              : selected.length === 0
                ? "Pick squares first"
                : `Confirm ${selected.length} pick${selected.length === 1 ? "" : "s"}`}
          </button>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        {me && (
          <div className="card space-y-2">
            <p className="label">Your square color</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleColorChange(c)}
                  style={{ background: c }}
                  className={`h-7 w-7 rounded-full border-2 ${
                    color === c ? "border-forest" : "border-line"
                  }`}
                  aria-label={`Pick color ${c}`}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorChange(e.target.value)}
                className="h-7 w-9 cursor-pointer rounded border border-line"
              />
            </div>
          </div>
        )}

        {confirmed && (
          <PaymentInstructions pool={pool} confirmed={confirmed} />
        )}
      </aside>

      <section className="card -mx-2 overflow-x-auto px-2">
        <Grid
          squares={squares}
          selectedSquares={me ? selected : []}
          onToggleSelect={me ? toggleSelect : undefined}
          selectionColor={me?.color}
          showNumbers
          showAxisLabels
        />
      </section>
    </div>
  );
}

function PaymentInstructions({
  pool,
  confirmed,
}: {
  pool: Pool;
  confirmed: { count: number; total: number };
}) {
  const hasPayment = !!(pool.zelleHandle || pool.venmoHandle);
  return (
    <div className="card border-accent-gold bg-accent-goldSoft/30 space-y-3">
      <div>
        <p className="label">Picks confirmed</p>
        <p className="mt-1 text-base font-bold text-ink">
          {confirmed.count} square{confirmed.count === 1 ? "" : "s"} · ${confirmed.total.toLocaleString()} owed
        </p>
      </div>

      {hasPayment ? (
        <div className="space-y-2 text-sm">
          <p className="text-ink/70">Send <span className="font-bold text-ink">${confirmed.total.toLocaleString()}</span> to the pool admin:</p>
          {pool.zelleHandle && (
            <CopyRow label="Zelle" value={pool.zelleHandle} />
          )}
          {pool.venmoHandle && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-line bg-white px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-ink/60">Venmo</p>
                <p className="truncate text-sm font-semibold text-ink">@{pool.venmoHandle}</p>
              </div>
              <a
                href={`https://venmo.com/${encodeURIComponent(pool.venmoHandle)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Open
              </a>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-ink/60">
          Ask {pool.name}&apos;s admin how they want to receive the entry fee.
        </p>
      )}
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-line bg-white px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-ink/60">{label}</p>
        <p className="truncate text-sm font-semibold text-ink">{value}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard may be blocked; user can long-press to copy */
          }
        }}
        className="btn-secondary"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
