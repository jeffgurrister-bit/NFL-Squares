import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PoolHeader } from "@/components/PoolHeader";
import { Grid, type GridSquare } from "@/components/Grid";
import { weekTotals, allFinal } from "@/lib/scoring";
import { cellForDigitPair } from "@/lib/digits";

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ wk?: string }>;
}) {
  const { slug } = await params;
  const { wk } = await searchParams;
  const pool = await prisma.pool.findUnique({
    where: { slug },
    include: {
      squares: { include: { participant: true } },
      poolWeeks: { orderBy: { weekNumber: "asc" } },
    },
  });
  if (!pool) notFound();

  // Pull all games for the weeks this pool has tracked
  const weekNumbers = pool.poolWeeks.map((p) => p.weekNumber);
  const allGames = weekNumbers.length
    ? await prisma.game.findMany({ where: { weekNumber: { in: weekNumbers } } })
    : [];
  const gamesByWeek = new Map<number, typeof allGames>();
  for (const g of allGames) {
    const arr = gamesByWeek.get(g.weekNumber) ?? [];
    arr.push(g);
    gamesByWeek.set(g.weekNumber, arr);
  }

  const completedWeeks = pool.poolWeeks.filter((pw) => {
    const games = gamesByWeek.get(pw.weekNumber) ?? [];
    return pw.rowDigits && allFinal(games) && games.length > 0;
  });

  const selectedWeek =
    completedWeeks.find((w) => String(w.weekNumber) === wk) ?? completedWeeks[0] ?? null;

  const gridSquares: GridSquare[] = pool.squares.map((s) => ({
    row: s.row,
    col: s.col,
    participantId: s.participantId,
    participantName: s.participant.name,
    color: s.participant.color,
  }));

  return (
    <>
      <PoolHeader
        poolName={pool.name}
        poolSlug={pool.slug}
        activeWeek={pool.activeWeekNumber}
        current="history"
      />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold text-ink">Past Weeks</h1>
        <p className="mt-1 text-sm text-ink/60">
          Browse a completed week to see its grid, games, totals, winning square, and the reverse winner.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
          <aside>
            <p className="label mb-2">Completed</p>
            {completedWeeks.length === 0 ? (
              <p className="text-sm text-ink/60">No completed weeks yet.</p>
            ) : (
              <ul className="space-y-2">
                {completedWeeks.map((pw) => {
                  const games = gamesByWeek.get(pw.weekNumber) ?? [];
                  const totals = weekTotals(games);
                  const cell = cellForDigitPair(
                    pw.rowDigits,
                    pw.colDigits,
                    totals.winnersDigit,
                    totals.losersDigit,
                  );
                  const winner = cell
                    ? pool.squares.find((s) => s.row === cell.row && s.col === cell.col)?.participant.name
                    : null;
                  const isSelected = selectedWeek?.id === pw.id;
                  return (
                    <li key={pw.id}>
                      <Link
                        href={`/p/${pool.slug}/history?wk=${pw.weekNumber}`}
                        className={`block rounded-md border px-3 py-2 text-sm ${
                          isSelected ? "border-forest bg-forest text-white" : "border-line bg-white hover:bg-surface"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold">Week {pw.weekNumber}</span>
                          <span className={`text-xs ${isSelected ? "text-white/80" : "text-ink/60"}`}>
                            {totals.winners}-{totals.losers}
                          </span>
                        </div>
                        <p className={`mt-0.5 text-xs ${isSelected ? "text-white/80" : "text-ink/60"}`}>
                          Winner: {winner ?? "—"}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <section>
            {!selectedWeek ? (
              <div className="card text-sm text-ink/60">
                Once a week&apos;s games all go final, it&apos;ll appear here.
              </div>
            ) : (
              <SelectedWeek
                pw={selectedWeek}
                games={gamesByWeek.get(selectedWeek.weekNumber) ?? []}
                gridSquares={gridSquares}
                squares={pool.squares}
                poolSlug={pool.slug}
              />
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function SelectedWeek({
  pw,
  games,
  gridSquares,
  squares,
  poolSlug,
}: {
  pw: { weekNumber: number; rowDigits: string | null; colDigits: string | null };
  games: { awayTeam: string; homeTeam: string; awayScore: number | null; homeScore: number | null; isFinal: boolean; id: string }[];
  gridSquares: GridSquare[];
  squares: { row: number; col: number; participant: { name: string } }[];
  poolSlug: string;
}) {
  const totals = weekTotals(games);
  const winningCell = cellForDigitPair(pw.rowDigits, pw.colDigits, totals.winnersDigit, totals.losersDigit);
  const reverseCell = cellForDigitPair(pw.rowDigits, pw.colDigits, totals.losersDigit, totals.winnersDigit);
  const winnerName = winningCell
    ? squares.find((s) => s.row === winningCell.row && s.col === winningCell.col)?.participant.name
    : null;
  const reverseName = reverseCell
    ? squares.find((s) => s.row === reverseCell.row && s.col === reverseCell.col)?.participant.name
    : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SmallStat label="Winners' Total" value={totals.winners} sub={`last digit ${totals.winnersDigit}`} />
        <SmallStat label="Losers' Total" value={totals.losers} sub={`last digit ${totals.losersDigit}`} />
        <SmallStat
          label="Winning Square"
          value={winnerName ?? "Unclaimed"}
          sub={`(${totals.winnersDigit}, ${totals.losersDigit})`}
          highlight
        />
        <SmallStat
          label="Reverse Square"
          value={reverseName ?? "Unclaimed"}
          sub={`(${totals.losersDigit}, ${totals.winnersDigit})`}
          highlight
        />
      </div>

      <div className="card">
        <h3 className="mb-1 text-base font-bold text-ink">Games</h3>
        <p className="mb-3 text-xs text-ink/60">All scores from Week {pw.weekNumber}.</p>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink/50">
            <tr>
              <th className="py-2 text-left">Away</th>
              <th className="py-2 text-right">Score</th>
              <th className="py-2 text-left pl-4">Home</th>
              <th className="py-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => {
              const awayWon = g.awayScore != null && g.homeScore != null && g.awayScore > g.homeScore;
              const homeWon = g.awayScore != null && g.homeScore != null && g.homeScore > g.awayScore;
              return (
                <tr key={g.id} className="border-t border-line">
                  <td className={`py-2 ${awayWon ? "font-bold" : ""}`}>{g.awayTeam}</td>
                  <td className="py-2 text-right">{g.awayScore ?? "—"}</td>
                  <td className={`py-2 pl-4 ${homeWon ? "font-bold" : ""}`}>{g.homeTeam}</td>
                  <td className="py-2 text-right">{g.homeScore ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card overflow-x-auto">
        <h3 className="mb-1 text-base font-bold text-ink">Grid for Week {pw.weekNumber}</h3>
        <p className="mb-4 text-xs text-ink/60">
          Same names, that week&apos;s randomized digit headers.
        </p>
        <Grid
          squares={gridSquares}
          rowDigits={pw.rowDigits}
          colDigits={pw.colDigits}
          highlight={{ rowDigit: totals.winnersDigit, colDigit: totals.losersDigit }}
          reverseHighlight={{ rowDigit: totals.losersDigit, colDigit: totals.winnersDigit }}
          size="sm"
        />
      </div>

      <p className="text-xs text-ink/50">
        Pool: <Link href={`/p/${poolSlug}`} className="underline">{poolSlug}</Link>
      </p>
    </div>
  );
}

function SmallStat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`card ${highlight ? "border-accent-gold" : ""}`}>
      <p className="label">{label}</p>
      <p className="mt-2 text-xl font-bold text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink/60">{sub}</p>}
    </div>
  );
}
