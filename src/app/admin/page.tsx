import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { signOutAction } from "@/app/actions/auth";
import { dollars } from "@/lib/format";
import { CreatePoolForm } from "@/app/_components/CreatePoolForm";
import { computeWinningsByParticipant } from "@/lib/payouts";
import { GlobalUserManagement, type UserStatRow } from "./GlobalUserManagement";

export default async function GlobalAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await isAdmin())) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-ink">Admin only</h1>
        <p className="mt-2 text-sm text-ink/60">
          You need an admin account to view this page. Ask an existing admin to promote you.
        </p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          Back to pools
        </Link>
      </main>
    );
  }

  // Pull every pool with the data we need to summarise for the stats row,
  // pools cards, and per-user aggregates below.
  const pools = await prisma.pool.findMany({
    include: {
      participants: { select: { id: true, userId: true, entryFeePaid: true } },
      squares: { select: { id: true, participantId: true } },
      payments: { select: { participantId: true, amount: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Compute winnings (Map<participantId, $>) for each pool.
  const winningsByParticipant = new Map<string, number>();
  for (const pool of pools) {
    const w = await computeWinningsByParticipant(pool.id);
    for (const [pid, amt] of w) winningsByParticipant.set(pid, amt);
  }

  // Site-wide totals
  let totalEntryOwed = 0;
  let totalEntryCollected = 0;
  let totalWon = 0;
  let totalPaidOut = 0;
  let totalSquares = 0;
  for (const pool of pools) {
    for (const p of pool.participants) {
      const sqCount = pool.squares.filter((s) => s.participantId === p.id).length;
      totalSquares += sqCount;
      totalEntryOwed += sqCount * pool.entryFeePerSquare;
      totalEntryCollected += p.entryFeePaid;
      totalWon += winningsByParticipant.get(p.id) ?? 0;
      totalPaidOut += pool.payments
        .filter((pmt) => pmt.participantId === p.id)
        .reduce((s, pmt) => s + pmt.amount, 0);
    }
  }
  const entryOutstanding = totalEntryOwed - totalEntryCollected;

  // Per-pool summary for the cards section.
  const poolSummaries = pools.map((pool) => {
    const sqCount = pool.squares.length;
    const entryOwed = sqCount * pool.entryFeePerSquare;
    const entryCollected = pool.participants.reduce((s, p) => s + p.entryFeePaid, 0);
    return {
      id: pool.id,
      name: pool.name,
      slug: pool.slug,
      squares: sqCount,
      entryOwed,
      entryCollected,
      entryOutstanding: entryOwed - entryCollected,
      activeWeekNumber: pool.activeWeekNumber,
      players: pool.participants.length,
    };
  });

  // Per-user aggregates across every pool.
  const users = await prisma.user.findMany({
    orderBy: [{ isAdmin: "desc" }, { createdAt: "asc" }],
    include: {
      participants: {
        include: {
          pool: { select: { entryFeePerSquare: true, name: true, slug: true } },
          squares: { select: { id: true } },
        },
      },
    },
  });

  const userRows: UserStatRow[] = users.map((u) => {
    let poolCount = 0;
    let squares = 0;
    let entryOwed = 0;
    let entryPaid = 0;
    let won = 0;
    const poolNames: string[] = [];
    for (const p of u.participants) {
      poolCount += 1;
      const sq = p.squares.length;
      squares += sq;
      entryOwed += sq * p.pool.entryFeePerSquare;
      entryPaid += p.entryFeePaid;
      won += winningsByParticipant.get(p.id) ?? 0;
      poolNames.push(p.pool.name);
    }
    // Sum payouts to this user's participants by sweeping the pool payments lists.
    const myParticipantIds = new Set(u.participants.map((p) => p.id));
    let paidOut = 0;
    for (const pool of pools) {
      for (const pmt of pool.payments) {
        if (myParticipantIds.has(pmt.participantId)) paidOut += pmt.amount;
      }
    }

    return {
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt.toISOString(),
      pools: poolCount,
      squares,
      entryOwed,
      entryPaid,
      won,
      paidOut,
      poolNames,
    };
  });

  const recentActivity = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { pool: { select: { name: true, slug: true } } },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-forest text-xs font-bold text-white">
              SQ
            </span>
            <span className="text-lg font-bold text-ink">NFL Squares</span>
          </Link>
          <span className="badge bg-accent-goldSoft text-ink">Admin Console</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-ink/60 hover:text-ink">
            ← Back to pools
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="btn-secondary">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mb-2">
        <h1 className="text-3xl font-bold text-ink">Admin Console</h1>
        <p className="mt-1 text-sm text-ink/60">
          Site-wide controls. Manage pools, users, and game data here.
        </p>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Pools" value={String(pools.length)} />
        <Stat label="Players" value={String(users.length)} />
        <Stat
          label="Entry Fees Collected"
          value={dollars(totalEntryCollected)}
          sub={`of ${dollars(totalEntryOwed)} owed`}
        />
        <Stat
          label="Outstanding"
          value={dollars(entryOutstanding)}
          accent={entryOutstanding > 0 ? "red" : "green"}
        />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-ink">Pools</h2>
            <p className="text-sm text-ink/60">
              Click any pool to manage its games, payments, and weekly digits.
            </p>
          </div>
          <CreatePoolForm />
        </div>

        {poolSummaries.length === 0 ? (
          <div className="card text-center text-sm text-ink/60">
            No pools yet. Click <strong>Create Pool</strong> to start one.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {poolSummaries.map((p) => (
              <Link
                key={p.id}
                href={`/p/${p.slug}/admin`}
                className="card transition hover:border-forest"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-ink">{p.name}</h3>
                  <span className="badge bg-forest/10 text-forest">Wk {p.activeWeekNumber}</span>
                </div>
                <dl className="space-y-1.5 text-sm">
                  <Row k="Squares" v={`${p.squares} / 100`} />
                  <Row k="Entry collected" v={`${dollars(p.entryCollected)} / ${dollars(p.entryOwed)}`} />
                  <Row
                    k="Outstanding"
                    v={dollars(p.entryOutstanding)}
                    accent={p.entryOutstanding > 0 ? "red" : "green"}
                  />
                </dl>
                <p className="mt-3 text-xs font-semibold text-forest">Open admin →</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <GlobalUserManagement users={userRows} />
      </section>

      <section className="mt-8">
        <div className="mb-3">
          <h2 className="text-lg font-bold text-ink">Recent Activity</h2>
          <p className="text-sm text-ink/60">Latest 10 events across every pool.</p>
        </div>
        {recentActivity.length === 0 ? (
          <div className="card text-center text-sm text-ink/60">No activity yet.</div>
        ) : (
          <ul className="card space-y-3">
            {recentActivity.map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink/40" />
                <div className="flex-1">
                  <p className="text-ink">{a.message}</p>
                  <p className="text-xs text-ink/50">
                    <Link href={`/p/${a.pool.slug}`} className="hover:underline">
                      {a.pool.name}
                    </Link>{" "}
                    · {timeAgo(a.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "red" | "green";
}) {
  const valueClass =
    accent === "red" ? "text-red-600" : accent === "green" ? "text-forest" : "text-ink";
  return (
    <div className="card">
      <p className="label">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink/50">{sub}</p>}
    </div>
  );
}

function Row({ k, v, accent }: { k: string; v: string; accent?: "red" | "green" }) {
  const valueClass =
    accent === "red" ? "text-red-600" : accent === "green" ? "text-forest" : "text-ink";
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink/60">{k}</dt>
      <dd className={`font-semibold ${valueClass}`}>{v}</dd>
    </div>
  );
}

function timeAgo(date: Date): string {
  const ms = Date.now() - date.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
