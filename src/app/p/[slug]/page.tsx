import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PoolHeader } from "@/components/PoolHeader";
import { Grid, type GridSquare } from "@/components/Grid";
import { dollars } from "@/lib/format";
import { weekTotals, allFinal } from "@/lib/scoring";
import { parseDigits } from "@/lib/digits";
import { auth } from "@/auth";
import { JoinPoolButton } from "./JoinPoolButton";

function timeAgo(date: Date): string {
  const ms = Date.now() - date.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default async function PoolHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pool = await prisma.pool.findUnique({
    where: { slug },
    include: {
      squares: { include: { participant: true } },
      participants: true,
      poolWeeks: true,
      activity: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
  if (!pool) notFound();

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const isAdmin = !!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
  const myParticipant = userId
    ? pool.participants.find((p) => p.userId === userId)
    : null;
  const isMember = !!myParticipant;

  const activeWeek = pool.poolWeeks.find((w) => w.weekNumber === pool.activeWeekNumber);
  const weekGames = await prisma.game.findMany({
    where: { weekNumber: pool.activeWeekNumber },
  });
  const totals = weekTotals(weekGames);
  const isComplete = allFinal(weekGames) && weekGames.length > 0;

  const gridSquares: GridSquare[] = pool.squares.map((s) => ({
    row: s.row,
    col: s.col,
    participantId: s.participantId,
    participantName: s.participant.name,
    color: s.participant.color,
  }));

  let latestWinner: string | null = null;
  for (const pw of [...pool.poolWeeks].sort((a, b) => b.weekNumber - a.weekNumber)) {
    if (!pw.rowDigits || !pw.colDigits) continue;
    const games = await prisma.game.findMany({ where: { weekNumber: pw.weekNumber } });
    if (!allFinal(games)) continue;
    const t = weekTotals(games);
    // Convention: row = losers' digit (left), col = winners' digit (top).
    const r = pw.rowDigits.indexOf(String(t.losersDigit));
    const c = pw.colDigits.indexOf(String(t.winnersDigit));
    if (r === -1 || c === -1) continue;
    const sq = pool.squares.find((s) => s.row === r && s.col === c);
    latestWinner = sq ? `${sq.participant.name} (Wk ${pw.weekNumber})` : `Unclaimed (Wk ${pw.weekNumber})`;
    break;
  }

  const mySquares = myParticipant
    ? pool.squares.filter((s) => s.participantId === myParticipant.id)
    : [];
  const mySquareCount = mySquares.length;

  // For the active week, derive the digit pair each of the user's squares
  // represents, given that week's randomized headers.
  const rd = parseDigits(activeWeek?.rowDigits ?? null);
  const cd = parseDigits(activeWeek?.colDigits ?? null);
  const myNumbersThisWeek = rd && cd
    ? mySquares.map((s) => ({
        squareNumber: s.row * 10 + s.col + 1,
        // Convention: row = losers (left), col = winners (top).
        winnersDigit: cd[s.col],
        losersDigit: rd[s.row],
        isWinner: isComplete && cd[s.col] === totals.winnersDigit && rd[s.row] === totals.losersDigit,
        isReverse: isComplete && cd[s.col] === totals.losersDigit && rd[s.row] === totals.winnersDigit,
      }))
    : [];

  return (
    <>
      <PoolHeader poolName={pool.name} poolSlug={pool.slug} activeWeek={pool.activeWeekNumber} current="grid" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-ink">{pool.name}</h1>
            <p className="mt-1 text-sm text-ink/60">
              {dollars(pool.entryFeePerSquare)}/square &middot; {dollars(pool.weeklyPrize)} weekly &middot;{" "}
              {dollars(pool.reverseWeeklyPrize)} reverse
            </p>
          </div>
          {isMember ? (
            <Link href={`/p/${pool.slug}/claim`} className="btn-primary">
              Claim Squares
            </Link>
          ) : (
            <JoinPoolButton poolId={pool.id} />
          )}
        </div>

        {!isMember && !isAdmin && (
          <div className="mb-6 rounded-xl border border-accent-gold bg-accent-goldSoft p-4 text-sm text-ink">
            You haven&apos;t joined this pool yet. Click <strong>Join pool</strong> above to start
            claiming squares.
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Claimed Squares" value={`${pool.squares.length} / 100`} />
          <Stat label="Players" value={String(pool.participants.length)} />
          <Stat
            label={isMember ? "Your Squares" : "Current Week"}
            value={isMember ? String(mySquareCount) : String(pool.activeWeekNumber)}
          />
          <Stat label="Latest Winner" value={latestWinner ?? "None yet"} />
        </div>

        {isMember && mySquareCount > 0 && (
          <section className="mb-6 card">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-ink">Your numbers this week</h2>
                <p className="text-xs text-ink/60">
                  Each of your squares maps to a (winners&apos; digit, losers&apos; digit) pair
                  for Week {pool.activeWeekNumber}.
                </p>
              </div>
              {isComplete && (
                <p className="text-xs text-ink/60">
                  Result: <span className="font-bold text-ink">W{totals.winnersDigit} / L{totals.losersDigit}</span>
                </p>
              )}
            </div>
            {!activeWeek?.rowDigits ? (
              <p className="text-sm text-ink/60">
                Digits haven&apos;t been randomized for this week yet. Check back closer to kickoff.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {myNumbersThisWeek.map((n) => (
                  <div
                    key={n.squareNumber}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      n.isWinner
                        ? "border-accent-gold bg-accent-goldSoft font-bold text-ink"
                        : n.isReverse
                          ? "border-forest bg-forest/10 font-semibold text-ink"
                          : "border-line bg-white text-ink"
                    }`}
                  >
                    <span className="text-xs text-ink/50">#{n.squareNumber}</span>
                    <span className="mx-2 font-mono">
                      W{n.winnersDigit} / L{n.losersDigit}
                    </span>
                    {n.isWinner && <span className="text-accent-gold">★ WIN</span>}
                    {n.isReverse && <span className="text-forest">↺ reverse</span>}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
          <section className="card overflow-x-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">The Grid</h2>
              <span className="badge bg-accent-gold text-ink">
                Week {pool.activeWeekNumber}{" "}
                {activeWeek?.rowDigits ? "Digits Active" : "Digits Pending"}
              </span>
            </div>
            <Grid
              squares={gridSquares}
              rowDigits={activeWeek?.rowDigits}
              colDigits={activeWeek?.colDigits}
              highlight={
                isComplete
                  ? { rowDigit: totals.losersDigit, colDigit: totals.winnersDigit }
                  : undefined
              }
              reverseHighlight={
                isComplete
                  ? { rowDigit: totals.winnersDigit, colDigit: totals.losersDigit }
                  : undefined
              }
              showAxisLabels
              showNumbers
            />
          </section>

          <section className="card">
            <h2 className="mb-4 text-base font-bold text-ink">Recent Activity</h2>
            {pool.activity.length === 0 ? (
              <p className="text-sm text-ink/60">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {pool.activity.map((a) => (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink/40" />
                    <div>
                      <p className="text-ink">{a.message}</p>
                      <p className="text-xs text-ink/50">{timeAgo(a.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="label">{label}</p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}
