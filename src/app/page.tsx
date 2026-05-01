import Link from "next/link";
import { prisma } from "@/lib/db";
import { dollars } from "@/lib/format";
import { CreatePoolForm } from "./_components/CreatePoolForm";

export default async function Home() {
  const pools = await prisma.pool.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { squares: true, participants: true } } },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink">Your Pools</h1>
          <p className="mt-1 text-sm text-ink/60">
            Pick a pool to play in, or start a new one.
          </p>
        </div>
        <CreatePoolForm />
      </div>

      <div className="space-y-6">
        <section>
          <p className="label mb-3">All pools ({pools.length})</p>
          {pools.length === 0 ? (
            <div className="card text-center text-sm text-ink/60">
              No pools yet. Create one to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {pools.map((p) => (
                <Link
                  key={p.id}
                  href={`/p/${p.slug}`}
                  className="card transition hover:border-forest"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-base font-bold text-ink">{p.name}</h2>
                      <p className="mt-0.5 text-sm text-ink/60">
                        {dollars(p.entryFeePerSquare)}/square &middot; {dollars(p.weeklyPrize)} weekly
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-ink">Open</span>
                  </div>
                  <p className="mt-4 text-sm text-ink/70">
                    <span className="font-bold text-ink">{p._count.squares}</span> / 100 claimed &middot;{" "}
                    {p._count.participants} players
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
