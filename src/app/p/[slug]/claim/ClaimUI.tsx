"use client";

import { useState } from "react";
import { Grid, type GridSquare } from "@/components/Grid";
import { claimSquare, createParticipant } from "@/app/actions/squares";

type Participant = { id: string; name: string; color: string };

const COLORS = ["#fecaca", "#bbf7d0", "#bfdbfe", "#fde68a", "#ddd6fe", "#fed7aa", "#a7f3d0", "#fbcfe8", "#c7d2fe", "#fef08a"];

export function ClaimUI({
  poolId,
  participants: initial,
  squares: initialSquares,
}: {
  poolId: string;
  poolSlug: string;
  participants: Participant[];
  squares: GridSquare[];
}) {
  const [participants, setParticipants] = useState<Participant[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLORS[participants.length % COLORS.length]);
  const [squares, setSquares] = useState<GridSquare[]>(initialSquares);
  const [error, setError] = useState<string | null>(null);

  async function handleAddName() {
    setError(null);
    if (!newName.trim()) {
      setError("Enter a name first.");
      return;
    }
    try {
      const created = await createParticipant(poolId, newName, newColor);
      setParticipants((p) => [...p, created]);
      setSelectedId(created.id);
      setNewName("");
      setNewColor(COLORS[(participants.length + 1) % COLORS.length]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add name");
    }
  }

  async function handleClaim(row: number, col: number) {
    if (!selectedId) return;
    setError(null);
    try {
      await claimSquare(poolId, selectedId, row, col);
      const me = participants.find((p) => p.id === selectedId);
      if (me) {
        setSquares((s) => [
          ...s,
          { row, col, participantId: me.id, participantName: me.name, color: me.color },
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to claim");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="card space-y-4">
        <div>
          <h3 className="text-sm font-bold text-ink">Who are you?</h3>
          <p className="mt-0.5 text-xs text-ink/60">Pick an existing name or add a new one.</p>
        </div>

        <div>
          <label className="label">Select existing</label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value || null)}
            className="input mt-1"
          >
            <option value="">-- Choose --</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative my-2 text-center text-[10px] font-semibold uppercase tracking-wide text-ink/40">
          <span className="bg-white px-2">or add new</span>
          <div className="absolute left-0 right-0 top-1/2 -z-0 border-t border-line" />
        </div>

        <div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Your Name"
            className="input"
          />
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-line"
            />
            <button
              type="button"
              onClick={handleAddName}
              disabled={!newName.trim()}
              className="btn-primary flex-1"
            >
              Add Name
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        {selectedId && (
          <div className="rounded-md bg-surface p-3 text-xs text-ink/70">
            Claiming as <span className="font-semibold text-ink">
              {participants.find((p) => p.id === selectedId)?.name}
            </span>. Tap empty squares to claim.
          </div>
        )}
      </aside>

      <section className="card overflow-x-auto">
        <Grid
          squares={squares}
          onClaim={handleClaim}
          selectedParticipantId={selectedId}
        />
      </section>
    </div>
  );
}
