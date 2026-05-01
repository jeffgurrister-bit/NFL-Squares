"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { pickColor } from "@/lib/format";

export async function createParticipant(poolId: string, name: string, color?: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name required");
  const existingCount = await prisma.participant.count({ where: { poolId } });
  const p = await prisma.participant.create({
    data: {
      poolId,
      name: trimmed,
      color: color || pickColor(existingCount),
    },
  });
  await prisma.activityLog.create({
    data: { poolId, message: `${trimmed} joined the pool` },
  });
  return { id: p.id, name: p.name, color: p.color };
}

export async function claimSquare(poolId: string, participantId: string, row: number, col: number) {
  if (row < 0 || row > 9 || col < 0 || col > 9) throw new Error("Invalid square");
  const existing = await prisma.square.findUnique({
    where: { poolId_row_col: { poolId, row, col } },
  });
  if (existing) throw new Error("Square already claimed");

  const sq = await prisma.square.create({
    data: { poolId, participantId, row, col },
    include: { participant: true },
  });
  await prisma.activityLog.create({
    data: { poolId, message: `${sq.participant.name} claimed 1 square` },
  });
  const slug = (await prisma.pool.findUnique({ where: { id: poolId } }))?.slug;
  if (slug) {
    revalidatePath(`/p/${slug}`);
    revalidatePath(`/p/${slug}/claim`);
  }
}

export async function unclaimSquare(squareId: string) {
  const sq = await prisma.square.findUnique({
    where: { id: squareId },
    include: { pool: true, participant: true },
  });
  if (!sq) return;
  await prisma.square.delete({ where: { id: squareId } });
  await prisma.activityLog.create({
    data: { poolId: sq.poolId, message: `Admin removed ${sq.participant.name}'s square` },
  });
  revalidatePath(`/p/${sq.pool.slug}`);
  revalidatePath(`/p/${sq.pool.slug}/admin`);
}
