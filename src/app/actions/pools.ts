"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/format";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/admin";

// Update editable pool settings — fee structure, payment handles, etc.
// Pass null to clear an optional field. Admin-only.
export async function updatePoolSettings(
  poolId: string,
  data: {
    name?: string;
    entryFeePerSquare?: number;
    weeklyPrize?: number;
    reverseWeeklyPrize?: number;
    adjacentPrize?: number;
    bonusDigitPrize?: number;
    zelleHandle?: string | null;
    venmoHandle?: string | null;
  },
) {
  await requireAdmin();
  const update: Record<string, unknown> = {};
  if (data.name != null) {
    const trimmed = data.name.trim();
    if (!trimmed) throw new Error("Pool name can't be empty.");
    update.name = trimmed.slice(0, 60);
  }
  for (const key of [
    "entryFeePerSquare",
    "weeklyPrize",
    "reverseWeeklyPrize",
    "adjacentPrize",
    "bonusDigitPrize",
  ] as const) {
    const v = data[key];
    if (v == null) continue;
    if (!Number.isFinite(v) || v < 0 || v > 1_000_000) {
      throw new Error(`${key} must be 0 or positive (max 1,000,000).`);
    }
    update[key] = Math.round(v);
  }
  if (data.zelleHandle !== undefined) {
    update.zelleHandle = data.zelleHandle?.trim() ? data.zelleHandle.trim().slice(0, 80) : null;
  }
  if (data.venmoHandle !== undefined) {
    // Strip a leading @ if present so we can render with one consistently.
    const v = data.venmoHandle?.trim().replace(/^@+/, "");
    update.venmoHandle = v ? v.slice(0, 40) : null;
  }
  const pool = await prisma.pool.update({ where: { id: poolId }, data: update });
  revalidatePath("/");
  revalidatePath(`/p/${pool.slug}`);
  revalidatePath(`/p/${pool.slug}/admin`);
  revalidatePath(`/p/${pool.slug}/claim`);
}

export async function createPool(formData: FormData) {
  const session = await auth();
  const isAdmin = !!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
  if (!isAdmin) throw new Error("Admin only");

  const name = String(formData.get("name") ?? "").trim();
  const entry = Number(formData.get("entryFeePerSquare") ?? 0);
  const weekly = Number(formData.get("weeklyPrize") ?? 0);
  const reverse = Number(formData.get("reverseWeeklyPrize") ?? 0);
  if (!name) throw new Error("Pool name required");

  let slug = slugify(name);
  let suffix = 1;
  while (await prisma.pool.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${slugify(name)}-${suffix}`;
  }

  await prisma.pool.create({
    data: {
      name,
      slug,
      entryFeePerSquare: entry,
      weeklyPrize: weekly,
      reverseWeeklyPrize: reverse,
    },
  });
  revalidatePath("/");
  redirect(`/p/${slug}`);
}
