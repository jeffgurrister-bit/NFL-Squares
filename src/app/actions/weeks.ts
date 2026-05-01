"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { randomDigits } from "@/lib/digits";
import { fetchEspnWeek } from "@/lib/espn";
import { requireAdmin } from "@/lib/admin";

function clampWeek(n: number): number {
  if (!Number.isInteger(n)) throw new Error("Week must be an integer.");
  if (n < 1 || n > 22) throw new Error("Week must be between 1 and 22.");
  return n;
}

function clampScore(n: number | null): number | null {
  if (n == null) return null;
  if (!Number.isFinite(n)) throw new Error("Score must be a number.");
  if (n < 0) throw new Error("Score can't be negative.");
  if (n > 999) throw new Error("Score is suspiciously high.");
  return Math.round(n);
}

export async function ensurePoolWeek(poolId: string, weekNumber: number) {
  const existing = await prisma.poolWeek.findUnique({
    where: { poolId_weekNumber: { poolId, weekNumber } },
  });
  if (existing) return existing;
  return prisma.poolWeek.create({ data: { poolId, weekNumber } });
}

export async function randomizeDigits(poolId: string, weekNumber: number) {
  await requireAdmin();
  const wk = clampWeek(weekNumber);
  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) throw new Error("Pool not found");
  await ensurePoolWeek(poolId, wk);
  await prisma.poolWeek.update({
    where: { poolId_weekNumber: { poolId, weekNumber: wk } },
    data: {
      rowDigits: randomDigits(),
      colDigits: randomDigits(),
      randomizedAt: new Date(),
    },
  });
  await prisma.activityLog.create({
    data: { poolId, message: `Week ${wk} digits randomized` },
  });
  revalidatePath(`/p/${pool.slug}`);
  revalidatePath(`/p/${pool.slug}/week/${wk}`);
  revalidatePath(`/p/${pool.slug}/admin`);
}

export async function setActiveWeek(poolId: string, weekNumber: number) {
  await requireAdmin();
  const wk = clampWeek(weekNumber);
  const pool = await prisma.pool.update({
    where: { id: poolId },
    data: { activeWeekNumber: wk },
  });
  await ensurePoolWeek(poolId, wk);
  revalidatePath(`/p/${pool.slug}`);
  revalidatePath(`/p/${pool.slug}/admin`);
}

export async function saveGameScore(
  gameId: string,
  awayScore: number | null,
  homeScore: number | null,
  isFinal: boolean,
) {
  await requireAdmin();
  await prisma.game.update({
    where: { id: gameId },
    data: {
      awayScore: clampScore(awayScore),
      homeScore: clampScore(homeScore),
      isFinal,
    },
  });
  revalidatePath("/", "layout");
}

export async function addGame(weekNumber: number, awayTeam: string, homeTeam: string) {
  await requireAdmin();
  const wk = clampWeek(weekNumber);
  const away = awayTeam.trim();
  const home = homeTeam.trim();
  if (!away || !home) throw new Error("Both teams required.");
  if (away.length > 60 || home.length > 60) throw new Error("Team name too long.");
  await prisma.game.create({
    data: { weekNumber: wk, awayTeam: away, homeTeam: home },
  });
  revalidatePath("/", "layout");
}

export async function deleteGame(gameId: string) {
  await requireAdmin();
  await prisma.game.delete({ where: { id: gameId } });
  revalidatePath("/", "layout");
}

export async function importEspnWeek(weekNumber: number, year: number) {
  await requireAdmin();
  const wk = clampWeek(weekNumber);
  const games = await fetchEspnWeek(year, wk);
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
        weekNumber: wk,
      },
      create: {
        espnId: g.espnId,
        awayTeam: g.awayTeam,
        homeTeam: g.homeTeam,
        awayScore: g.awayScore,
        homeScore: g.homeScore,
        isFinal: g.isFinal,
        kickoffAt: g.kickoffAt,
        weekNumber: wk,
      },
    });
  }
  revalidatePath("/", "layout");
  return games.length;
}
