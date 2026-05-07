import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchEspnWeek } from "@/lib/espn";

// Auto-refresh scores from ESPN. Runs hourly via Vercel Cron during the
// season; also reachable manually with the right Bearer token for debugging.
//
// Strategy: find every distinct (year-implied, week) pair we already have
// games for, plus the current calendar year's "active" week (max active
// across all pools), and re-fetch each from ESPN. For each, upsert games
// matched by espnId. Hand-entered games (no espnId) are untouched.
//
// We only refresh weeks that have at least one in-progress or non-final
// game, plus the most recent fully-final week (in case of late
// corrections). This avoids hammering ESPN for old weeks that won't change.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(req: Request): boolean {
  // Vercel Cron sends the secret as `Authorization: Bearer <CRON_SECRET>`.
  // If CRON_SECRET isn't set, we fail closed.
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const got = req.headers.get("authorization") ?? "";
  return got === `Bearer ${expected}`;
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Pick which weeks to refresh.
  const pools = await prisma.pool.findMany({ select: { activeWeekNumber: true } });
  const activeWeeks = Array.from(new Set(pools.map((p) => p.activeWeekNumber)));

  const weeksWithNonFinal = await prisma.game.groupBy({
    by: ["weekNumber"],
    where: { isFinal: false },
    _count: { _all: true },
  });
  const targetWeeks = Array.from(
    new Set([...activeWeeks, ...weeksWithNonFinal.map((g) => g.weekNumber)]),
  ).filter((w) => w >= 1 && w <= 22);

  const year = new Date().getFullYear();
  const results: Array<{ week: number; updated: number; error?: string }> = [];
  for (const wk of targetWeeks) {
    try {
      const games = await fetchEspnWeek(year, wk);
      let updated = 0;
      for (const g of games) {
        const r = await prisma.game.updateMany({
          where: { espnId: g.espnId },
          data: {
            awayTeam: g.awayTeam,
            homeTeam: g.homeTeam,
            awayScore: g.awayScore,
            homeScore: g.homeScore,
            isFinal: g.isFinal,
            kickoffAt: g.kickoffAt,
            weekNumber: wk,
          },
        });
        updated += r.count;
      }
      results.push({ week: wk, updated });
    } catch (e) {
      results.push({
        week: wk,
        updated: 0,
        error: e instanceof Error ? e.message : "unknown",
      });
    }
  }

  return NextResponse.json({ ok: true, weeks: targetWeeks, results });
}
