"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { pickColor } from "@/lib/format";
import { auth } from "@/auth";

// Recognises Prisma's "unique constraint failed" error so callers can
// translate it to a user-friendly message instead of leaking SQL detail.
function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

// Returns or creates a Participant linking the signed-in user to a pool.
// Each user gets exactly one Participant per pool (enforced by the unique
// (poolId, userId) constraint). The Participant carries their per-pool
// display name and color.
export async function joinPool(poolId: string, displayName?: string, color?: string) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const existing = await prisma.participant.findFirst({
    where: { poolId, userId },
  });
  if (existing) return { id: existing.id, name: existing.name, color: existing.color };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const fallbackName = (user?.name || user?.username || "Player").trim();
  const baseName = (displayName?.trim() || fallbackName).slice(0, 40);
  const count = await prisma.participant.count({ where: { poolId } });

  // Resolve display-name conflicts within the pool by suffixing.
  let name = baseName;
  let suffix = 2;
  while (await prisma.participant.findFirst({ where: { poolId, name } })) {
    name = `${baseName} ${suffix}`;
    suffix += 1;
  }

  let p;
  try {
    p = await prisma.participant.create({
      data: {
        poolId,
        userId,
        name,
        color: color || pickColor(count),
      },
    });
  } catch (e) {
    // Concurrent join from two devices: the unique (poolId, userId) wins.
    // Re-fetch and return the winner.
    if (isUniqueViolation(e)) {
      const found = await prisma.participant.findFirst({ where: { poolId, userId } });
      if (found) return { id: found.id, name: found.name, color: found.color };
    }
    throw e;
  }
  await prisma.activityLog.create({
    data: { poolId, message: `${name} joined the pool` },
  });
  const slug = (await prisma.pool.findUnique({ where: { id: poolId } }))?.slug;
  if (slug) {
    revalidatePath("/");
    revalidatePath(`/p/${slug}`);
    revalidatePath(`/p/${slug}/claim`);
  }
  return { id: p.id, name: p.name, color: p.color };
}

export async function claimSquare(poolId: string, row: number, col: number) {
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row > 9 || col < 0 || col > 9) {
    throw new Error("Invalid square");
  }
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  // Make sure this user has a Participant in the pool — auto-join if not.
  const me =
    (await prisma.participant.findFirst({ where: { poolId, userId } })) ||
    (await prisma.participant.create({
      data: {
        poolId,
        userId,
        name: await uniqueName(poolId, await displayNameFor(userId)),
        color: pickColor(await prisma.participant.count({ where: { poolId } })),
      },
    }));

  const existing = await prisma.square.findUnique({
    where: { poolId_row_col: { poolId, row, col } },
  });
  if (existing) throw new Error("Square already claimed.");

  try {
    await prisma.square.create({
      data: { poolId, participantId: me.id, row, col },
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new Error("Square already claimed.");
    throw e;
  }
  await prisma.activityLog.create({
    data: { poolId, message: `${me.name} claimed 1 square` },
  });
  const slug = (await prisma.pool.findUnique({ where: { id: poolId } }))?.slug;
  if (slug) {
    revalidatePath("/");
    revalidatePath(`/p/${slug}`);
    revalidatePath(`/p/${slug}/claim`);
  }
}

export async function unclaimSquare(squareId: string) {
  const session = await auth();
  const isAdmin = !!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
  if (!isAdmin) throw new Error("Admin only");

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

export async function setParticipantColor(participantId: string, color: string) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");
  const p = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!p || p.userId !== userId) throw new Error("Not your participant");
  await prisma.participant.update({ where: { id: participantId }, data: { color } });
  const pool = await prisma.pool.findUnique({ where: { id: p.poolId } });
  if (pool) revalidatePath(`/p/${pool.slug}`);
}

async function displayNameFor(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  return (u?.name || u?.username || "Player").trim();
}

async function uniqueName(poolId: string, base: string): Promise<string> {
  let name = base;
  let suffix = 2;
  while (await prisma.participant.findFirst({ where: { poolId, name } })) {
    name = `${base} ${suffix}`;
    suffix += 1;
  }
  return name;
}
