import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { signOutAction } from "@/app/actions/auth";
import { dollars } from "@/lib/format";
import { Grid, type GridSquare } from "@/components/Grid";
import { weekTotals, allFinal } from "@/lib/scoring";
import { CreatePoolForm } from "./_components/CreatePoolForm";
import { GoogleButton } from "./login/GoogleButton";

export default async function Home() {
  const session = await auth();
  const user = session?.user as
    | { id?: string; name?: string | null; isAdmin?: boolean }
    | undefined;

  if (!user?.id) return <LandingPage />;

  const isAdmin = !!user.isAdmin;

  // Pools the user has joined (= has a Participant row in)
  const myPools = await prisma.pool.findMany({
    where: { participants: { some: { userId: user.id } } },
    include: {
      squares: { include: { participant: true } },
      participants: true,
      poolWeeks: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Admins also see all pools (so they can manage every pool from here)
  const allPools = isAdmin
    ? await prisma.pool.findMany({
        where: { id: { notIn: myPools.map((p) => p.id) } },
        include: {
          squares: { include: { participant: true } },
          participants: true,
          poolWeeks: true,
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-ink">Your Pools</h1>
          <p className="mt-1 text-sm text-ink/60">
            Welcome back, {user.name ?? "player"}.
            {isAdmin ? " You have admin powers." : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && <CreatePoolForm />}
          <form action={signOutAction}>
            <button type="submit" className="btn-secondary">
              Sign out
            </button>
          </form>
        </div>
      </div>

      {myPools.length === 0 && allPools.length === 0 ? (
        <div className="card text-center text-sm text-ink/60">
          {isAdmin ? (
            <>
              No pools yet. Click <strong>Create Pool</strong> above to start one.
            </>
          ) : (
            <>
              You haven&apos;t joined any pools yet. Ask your pool admin for a link to a pool.
            </>
          )}
        </div>
      ) : (
        <>
          {myPools.length > 0 && (
            <section>
              <p className="label mb-3">Joined ({myPools.length})</p>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {myPools.map((p) => (
                  <PoolCard key={p.id} pool={p} userId={user.id!} mine />
                ))}
              </div>
            </section>
          )}
          {allPools.length > 0 && (
            <section className="mt-8">
              <p className="label mb-3">Other pools ({allPools.length})</p>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {allPools.map((p) => (
                  <PoolCard key={p.id} pool={p} userId={user.id!} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

type PoolWithRelations = {
  id: string;
  slug: string;
  name: string;
  entryFeePerSquare: number;
  weeklyPrize: number;
  reverseWeeklyPrize: number;
  activeWeekNumber: number;
  squares: Array<{ row: number; col: number; participantId: string; participant: { name: string; color: string; userId: string | null } }>;
  participants: Array<{ id: string; userId: string | null }>;
  poolWeeks: Array<{ weekNumber: number; rowDigits: string | null; colDigits: string | null }>;
};

async function PoolCard({
  pool,
  userId,
  mine,
}: {
  pool: PoolWithRelations;
  userId: string;
  mine?: boolean;
}) {
  const myParticipant = pool.participants.find((p) => p.userId === userId);
  const mySquares = myParticipant
    ? pool.squares.filter((s) => s.participantId === myParticipant.id).length
    : 0;

  const activeWeek = pool.poolWeeks.find((w) => w.weekNumber === pool.activeWeekNumber);
  const games = await prisma.game.findMany({ where: { weekNumber: pool.activeWeekNumber } });
  const totals = weekTotals(games);
  const isComplete = allFinal(games) && games.length > 0;

  const gridSquares: GridSquare[] = pool.squares.map((s) => ({
    row: s.row,
    col: s.col,
    participantId: s.participantId,
    participantName: s.participant.name,
    color: s.participant.color,
  }));

  return (
    <Link
      href={`/p/${pool.slug}`}
      className="card flex flex-col gap-4 transition hover:border-forest"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">{pool.name}</h2>
          <p className="mt-0.5 text-sm text-ink/60">
            {dollars(pool.entryFeePerSquare)}/square · {dollars(pool.weeklyPrize)} weekly
          </p>
        </div>
        <span className="badge bg-forest/10 text-forest">Wk {pool.activeWeekNumber}</span>
      </div>

      <div className="flex justify-center">
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
          size="sm"
        />
      </div>

      <div className="flex items-center justify-between border-t border-line pt-3 text-sm">
        <span className="text-ink/70">
          <span className="font-bold text-ink">{pool.squares.length}</span> / 100 claimed
          {mine && (
            <>
              {" · "}
              <span className="font-bold text-ink">{mySquares}</span> yours
            </>
          )}
        </span>
        <span className="font-semibold text-forest">Open →</span>
      </div>
    </Link>
  );
}

function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <div className="inline-flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-forest text-sm font-bold text-white">
          SQ
        </span>
        <span className="text-2xl font-bold text-ink">NFL Squares</span>
      </div>

      <h1 className="mt-8 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
        A season-long squares pool.
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base text-ink/60">
        Claim squares once for the whole season. Digit headers re-randomize every week. Win when
        the last digits of all winning teams&apos; and losing teams&apos; combined scores match
        your square.
      </p>

      <div className="mx-auto mt-10 grid max-w-md grid-cols-1 gap-3">
        <Link href="/login" className="btn-primary">
          Sign in
        </Link>
        <Link href="/signup" className="btn-secondary">
          Create an account
        </Link>
        {process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && (
          <div className="mt-2">
            <GoogleButton />
          </div>
        )}
      </div>

      <p className="mt-12 text-xs text-ink/50">
        Got a pool URL from a friend? Sign in or create an account first, then click the link.
      </p>
    </main>
  );
}
