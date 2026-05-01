import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PoolHeader } from "@/components/PoolHeader";
import { Grid, type GridSquare } from "@/components/Grid";
import { weekTotals, allFinal } from "@/lib/scoring";

export default async function WeekPage({
  params,
}: {
  params: Promise<{ slug: string; n: string }>;
}) {
  const { slug, n } = await params;
  const weekNumber = Number(n);
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 18) notFound();

  const pool = await prisma.pool.findUnique({
    where: { slug },
    include: {
      squares: { include: { participant: true } },
      poolWeeks: { where: { weekNumber } },
    },
  });
  if (!pool) notFound();

  const pw = pool.poolWeeks[0];
  const games = await prisma.game.findMany({
    where: { weekNumber },
    orderBy: { kickoffAt: "asc" },
  });
  const totals = weekTotals(games);
  const isComplete = allFinal(games) && games.length > 0;
  const isActive = pool.activeWeekNumber === weekNumber;

  const gridSquares: GridSquare[] = pool.squares.map((s) => ({
    row: s.row,
    col: s.col,
    participantId: s.participantId,
    participantName: s.participant.name,
    color: s.participant.color,
  }));

  return (
    <>
      <PoolHeader poolName={pool.name} poolSlug={pool.slug} activeWeek={pool.activeWeekNumber} current="week" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold text-ink">Week {weekNumber}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          {isActive && <span className="badge bg-forest text-white">Active Week</span>}
          {pw?.rowDigits && <span className="badge bg-accent-gold text-ink">Digits Randomized</span>}
          {isComplete && <span className="badge bg-accent-goldSoft text-ink">Final Result</span>}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <section className="space-y-4">
            <div className="card">
              <h2 className="mb-3 text-base font-bold text-ink">Games</h2>
              {games.length === 0 ? (
                <p className="text-sm text-ink/60">No games yet for this week.</p>
              ) : (
                <ul className="space-y-3">
                  {games.map((g) => (
                    <li key={g.id} className="rounded-md border border-line p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-ink/60">Away</span>
                        <span className={`font-semibold ${
                          g.isFinal && g.awayScore != null && g.homeScore != null && g.awayScore > g.homeScore ? "text-ink" : "text-ink/70"
                        }`}>
                          {g.awayTeam}
                        </span>
                        <span className="font-bold text-ink">{g.awayScore ?? "—"}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-ink/60">Home</span>
                        <span className={`font-semibold ${
                          g.isFinal && g.awayScore != null && g.homeScore != null && g.homeScore > g.awayScore ? "text-ink" : "text-ink/70"
                        }`}>
                          {g.homeTeam}
                        </span>
                        <span className="font-bold text-ink">{g.homeScore ?? "—"}</span>
                      </div>
                      {g.isFinal && (
                        <p className="mt-2 text-center text-xs font-bold text-red-600">FINAL</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card">
              <h3 className="mb-3 text-base font-bold text-ink">Running Totals</h3>
              <dl className="space-y-2 text-sm">
                <Row label="Winners Total" value={String(totals.winners)} />
                <Row label="Losers Total" value={String(totals.losers)} />
                <Row
                  label="Current Target Digits"
                  value={
                    games.length > 0 ? (
                      <span className="font-mono">
                        <span className="rounded bg-line/60 px-1.5 py-0.5">{totals.winnersDigit}</span>
                        {" / "}
                        <span className="rounded bg-line/60 px-1.5 py-0.5">{totals.losersDigit}</span>
                      </span>
                    ) : "—"
                  }
                />
              </dl>
            </div>
          </section>

          <section className="card overflow-x-auto">
            <h2 className="mb-4 text-base font-bold text-ink">Mini Grid</h2>
            {pw?.rowDigits ? (
              <Grid
                squares={gridSquares}
                rowDigits={pw.rowDigits}
                colDigits={pw.colDigits}
                highlight={
                  games.length > 0
                    ? { rowDigit: totals.winnersDigit, colDigit: totals.losersDigit }
                    : undefined
                }
                reverseHighlight={
                  games.length > 0
                    ? { rowDigit: totals.losersDigit, colDigit: totals.winnersDigit }
                    : undefined
                }
                size="sm"
              />
            ) : (
              <p className="text-sm text-ink/60">
                Digits haven&apos;t been randomized for this week yet. Check back closer to kickoff.
              </p>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-2 last:border-0 last:pb-0">
      <dt className="text-ink/60">{label}</dt>
      <dd className="font-bold text-ink">{value}</dd>
    </div>
  );
}
