import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PoolHeader } from "@/components/PoolHeader";
import { isAdmin } from "@/lib/admin";
import { dollars } from "@/lib/format";
import { computePaidOutByParticipant, computeWinningsByParticipant } from "@/lib/payouts";
import { PaymentsTable } from "./PaymentsTable";
import { WeekManager } from "./WeekManager";
import { UserManagement } from "./UserManagement";

export default async function AdminPage({
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
      participants: { orderBy: { createdAt: "asc" } },
      squares: { include: { participant: true } },
      poolWeeks: { orderBy: { weekNumber: "asc" } },
    },
  });
  if (!pool) notFound();

  const admin = await isAdmin();
  if (!admin) {
    return (
      <>
        <PoolHeader poolName={pool.name} poolSlug={pool.slug} activeWeek={pool.activeWeekNumber} current="admin" />
        <main className="mx-auto max-w-md px-4 py-16">
          <div className="card text-center">
            <h1 className="text-xl font-bold text-ink">Admin only</h1>
            <p className="mt-2 text-sm text-ink/60">
              You need an admin account to view this page. If you should have access,
              ask the current admin to promote you.
            </p>
            <Link href={`/p/${pool.slug}`} className="btn-primary mt-4 inline-flex">
              Back to pool
            </Link>
          </div>
        </main>
      </>
    );
  }

  const winnings = await computeWinningsByParticipant(pool.id);
  const paidOut = await computePaidOutByParticipant(pool.id);

  const players = pool.participants.map((p) => {
    const squareCount = pool.squares.filter((s) => s.participantId === p.id).length;
    const won = winnings.get(p.id) ?? 0;
    const paid = paidOut.get(p.id) ?? 0;
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      squares: squareCount,
      owed: squareCount * pool.entryFeePerSquare,
      won,
      paidOut: paid,
      balance: won - paid,
    };
  });

  const totalWon = players.reduce((s, p) => s + p.won, 0);
  const totalPaid = players.reduce((s, p) => s + p.paidOut, 0);
  const outstanding = totalWon - totalPaid;

  const selectedWeekNumber = wk ? Number(wk) : pool.activeWeekNumber;
  const selectedPoolWeek =
    pool.poolWeeks.find((w) => w.weekNumber === selectedWeekNumber) ?? null;
  const selectedGames = await prisma.game.findMany({
    where: { weekNumber: selectedWeekNumber },
    orderBy: { kickoffAt: "asc" },
  });
  const allWeeks = Array.from({ length: 18 }, (_, i) => i + 1);

  // Pull all users for the user management section
  const users = await prisma.user.findMany({
    orderBy: [{ isAdmin: "desc" }, { createdAt: "asc" }],
    select: { id: true, name: true, username: true, email: true, isAdmin: true, createdAt: true },
  });

  return (
    <>
      <PoolHeader poolName={pool.name} poolSlug={pool.slug} activeWeek={pool.activeWeekNumber} current="admin" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold text-ink">{pool.name} — Admin</h1>
        <p className="mt-1 text-sm text-ink/60">
          Manage this pool&apos;s weeks, digits, and player payments. Game scores below are shared across all pools.
        </p>

        <section className="mt-6">
          <div className="card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-ink">Player Payments</h2>
                <p className="mt-0.5 text-sm text-ink/60">
                  Entry fee {dollars(pool.entryFeePerSquare)} per square. Weekly prize {dollars(pool.weeklyPrize)}, reverse-square prize {dollars(pool.reverseWeeklyPrize)}. Update each player&apos;s running paid-out total below.
                </p>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-ink/60">Total won:</p>
                  <p className="font-bold text-ink">{dollars(totalWon)}</p>
                </div>
                <div>
                  <p className="text-ink/60">Paid out:</p>
                  <p className="font-bold text-ink">{dollars(totalPaid)}</p>
                </div>
                <div>
                  <p className="text-ink/60">Outstanding:</p>
                  <p className="font-bold text-red-600">{dollars(outstanding)}</p>
                </div>
              </div>
            </div>
            <PaymentsTable poolId={pool.id} players={players} />
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="card">
            <h3 className="text-base font-bold text-ink">Select Week</h3>
            <p className="mt-1 text-xs text-ink/60">
              Digits and active week are per-pool. Game scores (right) are shared.
            </p>
            <ul className="mt-3 space-y-1.5">
              {allWeeks.map((n) => {
                const isActive = pool.activeWeekNumber === n;
                const isSelected = selectedWeekNumber === n;
                return (
                  <li key={n}>
                    <a
                      href={`/p/${pool.slug}/admin?wk=${n}`}
                      className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                        isSelected ? "border-forest bg-forest/5" : "border-line bg-white hover:bg-surface"
                      }`}
                    >
                      <span className="font-semibold text-ink">Week {n}</span>
                      {isActive && <span className="badge bg-forest/10 text-forest">Active</span>}
                    </a>
                  </li>
                );
              })}
            </ul>
          </aside>

          <WeekManager
            poolId={pool.id}
            poolSlug={pool.slug}
            weekNumber={selectedWeekNumber}
            poolWeek={
              selectedPoolWeek
                ? {
                    rowDigits: selectedPoolWeek.rowDigits,
                    colDigits: selectedPoolWeek.colDigits,
                    randomizedAt: selectedPoolWeek.randomizedAt?.toISOString() ?? null,
                  }
                : null
            }
            isActive={pool.activeWeekNumber === selectedWeekNumber}
            games={selectedGames.map((g) => ({
              id: g.id,
              awayTeam: g.awayTeam,
              homeTeam: g.homeTeam,
              awayScore: g.awayScore,
              homeScore: g.homeScore,
              isFinal: g.isFinal,
            }))}
          />
        </section>

        <section className="mt-6">
          <UserManagement users={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))} />
        </section>
      </main>
    </>
  );
}
