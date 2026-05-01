import { fetchEspnCurrentScoreboard, type EspnGame } from "@/lib/espn";

export async function NFLBar() {
  const games = await fetchEspnCurrentScoreboard(8);
  if (games.length === 0) return null;

  // Decide a heading based on what we got back.
  const anyFinal = games.some((g) => g.isFinal);
  const anyUpcoming = games.some((g) => !g.isFinal);
  const heading =
    anyUpcoming && anyFinal
      ? "This week's NFL"
      : anyFinal
        ? "Latest NFL scores"
        : "Upcoming NFL games";

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">{heading}</h2>
        <span className="text-xs text-ink/50">via ESPN</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {games.map((g) => (
          <GameCard key={g.espnId} game={g} />
        ))}
      </div>
    </section>
  );
}

function GameCard({ game }: { game: EspnGame }) {
  const awayWon = game.isFinal && game.awayScore != null && game.homeScore != null && game.awayScore > game.homeScore;
  const homeWon = game.isFinal && game.awayScore != null && game.homeScore != null && game.homeScore > game.awayScore;
  return (
    <div className="min-w-[180px] shrink-0 rounded-lg border border-line bg-white p-3 text-sm">
      <Row team={game.awayTeam} score={game.awayScore} won={awayWon} />
      <Row team={game.homeTeam} score={game.homeScore} won={homeWon} />
      <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wide">
        {game.isFinal ? (
          <span className="text-red-600">FINAL</span>
        ) : game.kickoffAt ? (
          <span className="text-ink/60">{kickoffLabel(game.kickoffAt)}</span>
        ) : (
          <span className="text-ink/40">Scheduled</span>
        )}
      </p>
    </div>
  );
}

function Row({ team, score, won }: { team: string; score: number | null; won: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`truncate ${won ? "font-bold text-ink" : "text-ink/70"}`}>{team}</span>
      <span className={`tabular-nums ${won ? "font-bold text-ink" : "text-ink/70"}`}>
        {score ?? "—"}
      </span>
    </div>
  );
}

function kickoffLabel(d: Date): string {
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
