import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
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
  return (
    <>
      <PoolHeader poolName={pool.name} poolSlug={pool.slug} activeWeek={pool.activeWeekNumber} current="claim" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-1 text-3xl font-bold text-ink">Claim Squares</h1>
        <p className="mb-6 text-sm text-ink/60">
          Select your name and tap empty squares to claim them for the season in {pool.name}.
        </p>
        <ClaimUI
          poolId={pool.id}
          poolSlug={pool.slug}
          participants={pool.participants.map((p) => ({ id: p.id, name: p.name, color: p.color }))}
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
