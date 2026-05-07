"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function recordPayment(
  poolId: string,
  participantId: string,
  amount: number,
  note?: string,
) {
  await requireAdmin();
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be positive");
  await prisma.payment.create({
    data: { poolId, participantId, amount: Math.round(amount), note },
  });
  const slug = (await prisma.pool.findUnique({ where: { id: poolId } }))?.slug;
  if (slug) revalidatePath(`/p/${slug}/admin`);
}

// Set the cumulative entry-fee dollars an admin has marked as received from
// a participant. This is a SET (not increment) so the admin can correct typos
// or reset by typing the new total directly.
export async function setEntryFeePaid(participantId: string, amount: number) {
  await requireAdmin();
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Amount must be 0 or positive.");
  const p = await prisma.participant.update({
    where: { id: participantId },
    data: { entryFeePaid: Math.round(amount) },
    include: { pool: true },
  });
  revalidatePath(`/p/${p.pool.slug}/admin`);
}
