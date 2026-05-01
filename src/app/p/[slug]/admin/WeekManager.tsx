"use client";

import { useState } from "react";
import {
  randomizeDigits,
  setActiveWeek,
  saveGameScore,
  addGame,
  deleteGame,
  importEspnWeek,
} from "@/app/actions/weeks";

type Game = {
  id: string;
  awayTeam: string;
  homeTeam: string;
  awayScore: number | null;
  homeScore: number | null;
  isFinal: boolean;
};

type Props = {
  poolId: string;
  poolSlug: string;
  weekNumber: number;
  poolWeek: { rowDigits: string | null; colDigits: string | null; randomizedAt: string | null } | null;
  isActive: boolean;
  games: Game[];
};

export function WeekManager({ poolId, poolSlug, weekNumber, poolWeek, isActive, games }: Props) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(key: string, fn: () => Promise<T>) {
    setPending(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink">Week {weekNumber}</h2>
            <p className="mt-0.5 text-xs text-ink/60">
              Per-pool digits {poolWeek?.rowDigits ? "are randomized" : "have not been randomized"}.
              {isActive ? " This is the active week." : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isActive && (
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => run("active", () => setActiveWeek(poolId, weekNumber))}
                className="btn-secondary"
              >
                Mark active
              </button>
            )}
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => run("rand", () => randomizeDigits(poolId, weekNumber))}
              className="btn-primary"
            >
              {poolWeek?.rowDigits ? "Re-randomize digits" : "Randomize digits"}
            </button>
          </div>
        </div>

        {poolWeek?.rowDigits && poolWeek.colDigits && (
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-md bg-surface p-3">
              <p className="label">Row digits (winners)</p>
              <p className="mt-1 font-mono text-base text-ink">
                {poolWeek.rowDigits.split("").join(" ")}
              </p>
            </div>
            <div className="rounded-md bg-surface p-3">
              <p className="label">Col digits (losers)</p>
              <p className="mt-1 font-mono text-base text-ink">
                {poolWeek.colDigits.split("").join(" ")}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-ink">Games (Week {weekNumber})</h3>
            <p className="mt-0.5 text-xs text-ink/60">
              Game scores are shared across all pools. Mark FINAL to lock in scoring.
            </p>
          </div>
          <button
            type="button"
            disabled={pending !== null}
            onClick={() =>
              run("espn", async () => {
                const count = await importEspnWeek(weekNumber, new Date().getFullYear());
                if (count === 0) setError("ESPN returned no games for this week.");
              })
            }
            className="btn-secondary"
          >
            {pending === "espn" ? "Importing..." : "Import from ESPN"}
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {games.length === 0 ? (
            <p className="text-sm text-ink/60">No games for Week {weekNumber} yet. Import from ESPN or add manually below.</p>
          ) : (
            games.map((g) => <GameRow key={g.id} game={g} />)
          )}
        </div>

        <AddGameRow weekNumber={weekNumber} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <p className="text-xs text-ink/50">
        Pool slug: <code>{poolSlug}</code>
      </p>
    </div>
  );
}

function GameRow({ game }: { game: Game }) {
  const [away, setAway] = useState<string>(game.awayScore?.toString() ?? "");
  const [home, setHome] = useState<string>(game.homeScore?.toString() ?? "");
  const [isFinal, setIsFinal] = useState(game.isFinal);
  const [pending, setPending] = useState(false);

  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto_auto] items-center gap-2 rounded-md border border-line p-2 text-sm">
      <div className="text-right pr-2">
        <p className="font-semibold text-ink">{game.awayTeam}</p>
        <p className="text-xs text-ink/50">Away</p>
      </div>
      <input
        type="number"
        min={0}
        value={away}
        onChange={(e) => setAway(e.target.value)}
        className="input w-16 text-center"
      />
      <div className="text-left pl-2">
        <p className="font-semibold text-ink">{game.homeTeam}</p>
        <p className="text-xs text-ink/50">Home</p>
      </div>
      <input
        type="number"
        min={0}
        value={home}
        onChange={(e) => setHome(e.target.value)}
        className="input w-16 text-center"
      />
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={isFinal}
            onChange={(e) => setIsFinal(e.target.checked)}
          />
          FINAL
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            try {
              await saveGameScore(
                game.id,
                away === "" ? null : Number(away),
                home === "" ? null : Number(home),
                isFinal,
              );
            } finally {
              setPending(false);
            }
          }}
          className="btn-secondary"
        >
          Save
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            if (!confirm(`Delete ${game.awayTeam} @ ${game.homeTeam}?`)) return;
            setPending(true);
            try {
              await deleteGame(game.id);
            } finally {
              setPending(false);
            }
          }}
          className="text-xs text-red-600 hover:underline"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function AddGameRow({ weekNumber }: { weekNumber: number }) {
  const [away, setAway] = useState("");
  const [home, setHome] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!away.trim() || !home.trim()) return;
        setPending(true);
        try {
          await addGame(weekNumber, away, home);
          setAway("");
          setHome("");
        } finally {
          setPending(false);
        }
      }}
      className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-sm"
    >
      <input
        value={away}
        onChange={(e) => setAway(e.target.value)}
        placeholder="Away team"
        className="input flex-1"
      />
      <span className="text-ink/40">@</span>
      <input
        value={home}
        onChange={(e) => setHome(e.target.value)}
        placeholder="Home team"
        className="input flex-1"
      />
      <button type="submit" disabled={pending || !away.trim() || !home.trim()} className="btn-secondary">
        Add game
      </button>
    </form>
  );
}
