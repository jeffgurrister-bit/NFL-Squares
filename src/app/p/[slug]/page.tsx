import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PoolHeader } from "@/components/PoolHeader";
import { Grid, type GridSquare } from "@/components/Grid";
import { dollars } from "@/lib/format";
import { weekTotals, allFinal } from "@/lib/scoring";
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
    const r = pw.rowDigits.indexOf(String(t.winnersDigit));
    const c = pw.colDigits.indexOf(String(t.losersDigit));
    if (r === -1 || c === -1) continue;
    const sq = pool.squares.find((s) => s.row === r && s.col === c);
    latestWinner = sq ? `${sq.participant.name} (Wk ${pw.weekNumber})` : `Unclaimed (Wk ${pw.weekNumber})`;
    break;
  }

  const mySquareCount = myParticipant
    ? pool.squares.filter((s) => s.participantId === myParticipant.id).length
    : 0;

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
                  ? { rowDigit: totals.winnersDigit, colDigit: totals.losersDigit }
                  : undefined
              }
              reverseHighlight={
                isComplete
                  ? { rowDigit: totals.losersDigit, colDigit: totals.winnersDigit }
                  : undefined
              }
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
