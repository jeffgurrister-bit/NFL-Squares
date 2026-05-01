"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/format";
import { auth } from "@/auth";

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
