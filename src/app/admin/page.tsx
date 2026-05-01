import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { signOutAction } from "@/app/actions/auth";
import { dollars } from "@/lib/format";
import { CreatePoolForm } from "@/app/_components/CreatePoolForm";
import { GlobalUserManagement } from "./GlobalUserManagement";

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

  const [pools, users, recentActivity, totalSquaresClaimed] = await Promise.all([
    prisma.pool.findMany({
      include: {
        _count: { select: { squares: true, participants: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      orderBy: [{ isAdmin: "desc" }, { createdAt: "asc" }],
      select: { id: true, name: true, username: true, email: true, isAdmin: true, createdAt: true },
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { pool: { select: { name: true, slug: true } } },
    }),
    prisma.square.count(),
  ]);

  const totalEntryDollars = pools.reduce(
    (s, p) => s + p._count.squares * p.entryFeePerSquare,
    0,
  );
  const adminCount = users.filter((u) => u.isAdmin).length;

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
        <Stat label="Users" value={String(users.length)} />
        <Stat label="Squares Claimed" value={`${totalSquaresClaimed}`} />
        <Stat label="Entry Fees Collected" value={dollars(totalEntryDollars)} />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">Pools</h2>
            <p className="text-sm text-ink/60">
              Create new pools, jump into any pool&apos;s admin to manage games + payments.
            </p>
          </div>
          <CreatePoolForm />
        </div>

        {pools.length === 0 ? (
          <div className="card text-center text-sm text-ink/60">
            No pools yet. Click <strong>Create Pool</strong> to start one.
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink/50">
                <tr className="border-b border-line">
                  <th className="py-2 text-left">Pool</th>
                  <th className="py-2 text-left">Players</th>
                  <th className="py-2 text-left">Squares</th>
                  <th className="py-2 text-left">Entry / Weekly / Reverse</th>
                  <th className="py-2 text-left">Active Wk</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pools.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="py-3">
                      <Link href={`/p/${p.slug}`} className="font-semibold text-ink hover:underline">
                        {p.name}
                      </Link>
                      <p className="text-xs text-ink/50">/p/{p.slug}</p>
                    </td>
                    <td className="py-3 text-ink">{p._count.participants}</td>
                    <td className="py-3 text-ink">{p._count.squares} / 100</td>
                    <td className="py-3 text-ink/70">
                      {dollars(p.entryFeePerSquare)} / {dollars(p.weeklyPrize)} / {dollars(p.reverseWeeklyPrize)}
                    </td>
                    <td className="py-3 text-ink">{p.activeWeekNumber}</td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/p/${p.slug}/admin`}
                        className="btn-secondary"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3">
          <h2 className="text-lg font-bold text-ink">Users</h2>
          <p className="text-sm text-ink/60">
            Promote players to admin so they can manage games and payments. {adminCount} admin
            {adminCount === 1 ? "" : "s"} currently.
          </p>
        </div>
        <GlobalUserManagement
          users={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
        />
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="label">{label}</p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
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
