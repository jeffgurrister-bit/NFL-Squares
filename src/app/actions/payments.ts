"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function recordPayment(
  poolId: string,
  participantId: string,
  amount: number,
  note?: string,
) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be positive");
  await prisma.payment.create({
    data: { poolId, participantId, amount: Math.round(amount), note },
  });
  const slug = (await prisma.pool.findUnique({ where: { id: poolId } }))?.slug;
  if (slug) revalidatePath(`/p/${slug}/admin`);
}
