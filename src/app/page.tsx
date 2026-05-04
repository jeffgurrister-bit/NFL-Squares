import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { signOutAction } from "@/app/actions/auth";
import { dollars } from "@/lib/format";
import { Grid, type GridSquare } from "@/components/Grid";
import { weekTotals, allFinal } from "@/lib/scoring";
import { AdminBootstrapBanner } from "./_components/AdminBootstrapBanner";
import { NFLBar } from "./_components/NFLBar";
import { GoogleButton } from "./login/GoogleButton";

export default async function Home() {
  const session = await auth();
  const user = session?.user as
    | { id?: string; name?: string | null; isAdmin?: boolean }
    | undefined;

  if (!user?.id) return <LandingPage />;

  const isAdmin = !!user.isAdmin;
  const adminExists = (await prisma.user.count({ where: { isAdmin: true } })) > 0;

  const myPools = await prisma.pool.findMany({
    where: { participants: { some: { userId: user.id } } },
    include: {
      squares: { include: { participant: true } },
      participants: true,
      poolWeeks: true,
    },
    orderBy: { createdAt: "asc" },
  });

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

  const hasPools = myPools.length > 0 || allPools.length > 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-forest text-xs font-bold text-white">
            SQ
          </span>
          <span className="text-lg font-bold text-ink">NFL Squares</span>
        </Link>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link href="/admin" className="btn-gold">
              Admin Console
            </Link>
          )}
          <span className="text-sm text-ink/60">Hi, {user.name ?? "player"}</span>
          <form action={signOutAction}>
            <button type="submit" className="btn-secondary">
              Sign out
            </button>
          </form>
        </div>
      </div>

      {isAdmin && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-gold bg-accent-goldSoft p-4">
          <div>
            <p className="font-bold text-ink">You&apos;re an admin.</p>
            <p className="text-xs text-ink/70">
              Visit the Admin Console for site-wide controls: create pools, manage users, see activity across every pool.
            </p>
          </div>
          <Link href="/admin" className="btn-primary whitespace-nowrap">
            Open Admin Console →
          </Link>
        </div>
      )}

      <div className="mb-6">
        <NFLBar />
      </div>

      {hasPools ? (
        <div className="space-y-8">
          <h1 className="text-2xl font-bold text-ink">
            Your Pools
            {isAdmin && <span className="ml-2 text-sm font-normal text-ink/50">(admin)</span>}
          </h1>
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
            <section>
              <p className="label mb-3">Other pools ({allPools.length})</p>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {allPools.map((p) => (
                  <PoolCard key={p.id} pool={p} userId={user.id!} />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <EmptyState
          isAdmin={isAdmin}
          adminExists={adminExists}
        />
      )}
    </main>
  );
}

function EmptyState({
  isAdmin,
  adminExists,
}: {
  isAdmin: boolean;
  adminExists: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      {!adminExists && !isAdmin && (
        <div className="w-full max-w-2xl">
          <AdminBootstrapBanner />
        </div>
      )}

      <div className="max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          {isAdmin ? "Create your first pool" : "No pools to play in yet"}
        </h1>
        <p className="mt-3 text-sm text-ink/60">
          {isAdmin
            ? "Open the Admin Console (button above) to create your first pool. You'll get a URL to share with your players."
            : adminExists
              ? "Ask the pool admin for a link. Once they send you one and you click it, your joined pools will show up here for easy switching."
              : "Once an admin sets up a pool, your joined pools will show up here. If you're the one running this, click \"I'm the admin\" above."}
        </p>
      </div>

      {/* Pretty sample grid + how-it-works for visual interest */}
      <div className="mt-4 w-full max-w-3xl">
        <div className="card">
          <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
            <div className="-mx-2 flex justify-center overflow-x-auto px-2">
              <SampleGrid />
            </div>
            <div className="text-left">
              <p className="label">How it works</p>
              <ol className="mt-2 space-y-2 text-sm text-ink/70">
                <li>
                  <span className="font-bold text-ink">1.</span> Players claim squares — once for the
                  whole season.
                </li>
                <li>
                  <span className="font-bold text-ink">2.</span> Each week the digit headers along
                  the top &amp; side are re-randomized.
                </li>
                <li>
                  <span className="font-bold text-ink">3.</span> Winning square = last digit of all
                  winning teams&apos; combined scores, last digit of all losing teams&apos;
                  combined scores. Reverse pair pays a smaller prize.
                </li>
                <li>
                  <span className="font-bold text-ink">4.</span> Admin enters scores and randomizes
                  digits each week. Payouts compute automatically.
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Static, for-show-only mini-grid that renders on the empty home state.
function SampleGrid() {
  const sample: GridSquare[] = [
    { row: 0, col: 2, participantId: "x", participantName: "Ali", color: "#fecaca" },
    { row: 4, col: 5, participantId: "y", participantName: "Sam", color: "#bbf7d0" },
    { row: 7, col: 1, participantId: "z", participantName: "Lee", color: "#bfdbfe" },
    { row: 8, col: 7, participantId: "w", participantName: "Jim", color: "#fde68a" },
  ];
  return (
    <Grid
      squares={sample}
      rowDigits="1473605289"
      colDigits="5347816209"
      highlight={{ rowDigit: 3, colDigit: 9 }}
      reverseHighlight={{ rowDigit: 9, colDigit: 3 }}
      size="sm"
    />
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

      <div className="-mx-2 flex justify-center overflow-x-auto px-2">
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
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-12 text-center">
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

      <div className="mx-auto mt-10 grid w-full max-w-md grid-cols-1 gap-3">
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
