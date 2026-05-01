"use client";

import { useState } from "react";
import { Grid, type GridSquare } from "@/components/Grid";
import { claimSquare, setParticipantColor } from "@/app/actions/squares";

const COLORS = ["#fecaca", "#bbf7d0", "#bfdbfe", "#fde68a", "#ddd6fe", "#fed7aa", "#a7f3d0", "#fbcfe8", "#c7d2fe", "#fef08a"];

export function ClaimUI({
  poolId,
  me,
  squares: initialSquares,
}: {
  poolId: string;
  me: { id: string; name: string; color: string } | null;
  squares: GridSquare[];
}) {
  const [squares, setSquares] = useState<GridSquare[]>(initialSquares);
  const [color, setColor] = useState<string>(me?.color ?? COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  async function handleClaim(row: number, col: number) {
    if (!me) {
      setError("Join the pool first.");
      return;
    }
    setError(null);
    try {
      await claimSquare(poolId, row, col);
      setSquares((s) => [
        ...s,
        { row, col, participantId: me.id, participantName: me.name, color: me.color },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to claim");
    }
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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="card space-y-4">
        <div>
          <h3 className="text-sm font-bold text-ink">Your identity</h3>
          <p className="mt-0.5 text-xs text-ink/60">
            {me
              ? `Claiming as ${me.name}.`
              : "You haven't joined this pool yet."}
          </p>
        </div>

        {me && (
          <div>
            <label className="label">Square color</label>
            <div className="mt-2 flex flex-wrap gap-2">
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

        {error && <p className="text-xs text-red-600">{error}</p>}

        {me && (
          <div className="rounded-md bg-surface p-3 text-xs text-ink/70">
            Tap any empty square in the grid to claim it. Your squares stay yours all season.
          </div>
        )}
      </aside>

      <section className="card overflow-x-auto">
        <Grid
          squares={squares}
          onClaim={me ? handleClaim : undefined}
          selectedParticipantId={me?.id ?? null}
        />
      </section>
    </div>
  );
}
