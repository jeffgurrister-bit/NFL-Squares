import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { PoolHeader } from "@/components/PoolHeader";
import { ClaimUI } from "./ClaimUI";

export default async function ClaimPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pool = await prisma.pool.findUnique({
    where: { slug },
    include: {
      participants: { orderBy: { createdAt: "asc" } },
      squares: { include: { participant: true } },
    },
  });
  if (!pool) notFound();

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const me = userId ? pool.participants.find((p) => p.userId === userId) ?? null : null;

  return (
    <>
      <PoolHeader poolName={pool.name} poolSlug={pool.slug} activeWeek={pool.activeWeekNumber} current="claim" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-1 text-3xl font-bold text-ink">Claim Squares</h1>
        <p className="mb-6 text-sm text-ink/60">
          {me
            ? `Tap empty squares below to claim them as ${me.name} in ${pool.name}.`
            : `Join ${pool.name} first, then tap empty squares to claim them for the season.`}
        </p>

        {!me && (
          <div className="mb-6">
            <Link href={`/p/${pool.slug}`} className="btn-primary">
              Go to pool home to join
            </Link>
          </div>
        )}

        <ClaimUI
          poolId={pool.id}
          me={me ? { id: me.id, name: me.name, color: me.color } : null}
          squares={pool.squares.map((s) => ({
            row: s.row,
            col: s.col,
            participantId: s.participantId,
            participantName: s.participant.name,
            color: s.participant.color,
          }))}
        />
      </main>
    </>
  );
}
