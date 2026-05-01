"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { randomDigits } from "@/lib/digits";
import { fetchEspnWeek } from "@/lib/espn";

export async function ensurePoolWeek(poolId: string, weekNumber: number) {
  const existing = await prisma.poolWeek.findUnique({
    where: { poolId_weekNumber: { poolId, weekNumber } },
  });
  if (existing) return existing;
  return prisma.poolWeek.create({ data: { poolId, weekNumber } });
}

export async function randomizeDigits(poolId: string, weekNumber: number) {
  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) throw new Error("Pool not found");
  await ensurePoolWeek(poolId, weekNumber);
  await prisma.poolWeek.update({
    where: { poolId_weekNumber: { poolId, weekNumber } },
    data: {
      rowDigits: randomDigits(),
      colDigits: randomDigits(),
      randomizedAt: new Date(),
    },
  });
  await prisma.activityLog.create({
    data: { poolId, message: `Week ${weekNumber} digits randomized` },
  });
  revalidatePath(`/p/${pool.slug}`);
  revalidatePath(`/p/${pool.slug}/week/${weekNumber}`);
  revalidatePath(`/p/${pool.slug}/admin`);
}

export async function setActiveWeek(poolId: string, weekNumber: number) {
  const pool = await prisma.pool.update({
    where: { id: poolId },
    data: { activeWeekNumber: weekNumber },
  });
  await ensurePoolWeek(poolId, weekNumber);
  revalidatePath(`/p/${pool.slug}`);
  revalidatePath(`/p/${pool.slug}/admin`);
}

export async function saveGameScore(
  gameId: string,
  awayScore: number | null,
  homeScore: number | null,
  isFinal: boolean,
) {
  await prisma.game.update({
    where: { id: gameId },
    data: { awayScore, homeScore, isFinal },
  });
  revalidatePath("/", "layout");
}

export async function addGame(weekNumber: number, awayTeam: string, homeTeam: string) {
  await prisma.game.create({
    data: { weekNumber, awayTeam: awayTeam.trim(), homeTeam: homeTeam.trim() },
  });
  revalidatePath("/", "layout");
}

export async function deleteGame(gameId: string) {
  await prisma.game.delete({ where: { id: gameId } });
  revalidatePath("/", "layout");
}

export async function importEspnWeek(weekNumber: number, year: number) {
  const games = await fetchEspnWeek(year, weekNumber);
  for (const g of games) {
    await prisma.game.upsert({
      where: { espnId: g.espnId },
      update: {
        awayTeam: g.awayTeam,
        homeTeam: g.homeTeam,
        awayScore: g.awayScore,
        homeScore: g.homeScore,
        isFinal: g.isFinal,
        kickoffAt: g.kickoffAt,
        weekNumber,
      },
      create: {
        espnId: g.espnId,
        awayTeam: g.awayTeam,
        homeTeam: g.homeTeam,
        awayScore: g.awayScore,
        homeScore: g.homeScore,
        isFinal: g.isFinal,
        kickoffAt: g.kickoffAt,
        weekNumber,
      },
    });
  }
  revalidatePath("/", "layout");
  return games.length;
}
