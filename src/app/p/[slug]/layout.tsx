import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function PoolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pool = await prisma.pool.findUnique({ where: { slug } });
  if (!pool) notFound();
  return <>{children}</>;
}
