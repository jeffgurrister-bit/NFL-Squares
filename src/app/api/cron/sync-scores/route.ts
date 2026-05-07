import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchEspnWeek } from "@/lib/espn";

// Auto-refresh scores from ESPN. Runs:
//   1. Daily at ~midnight ET via Vercel Cron (vercel.json)
//   2. Every 15 min during NFL game windows via GitHub Actions
//   3. Manually via the "Sync from ESPN" button on the admin page
//
// What it does each tick:
//   - Refresh games for any week with non-final games (catches late finals)
//   - Refresh + import the active week and the next two weeks for every
//     pool — so as Tuesday rolls around, the new week's matchups show up
//     automatically without anyone clicking anything
//   - Auto-advance each pool's activeWeekNumber once the current active
//     week's games are all final (admin only has to click 'Randomize
//     digits' for the new week — they don't have to bump the active week)

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(req: Request): boolean {
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
  const pools = await prisma.pool.findMany({
    select: { id: true, slug: true, activeWeekNumber: true },
  });
  const activeWeeks = new Set<number>(pools.map((p) => p.activeWeekNumber));
  // Pre-import next 2 weeks for every pool — so Tuesday matchups show up
  // automatically without any admin intervention.
  for (const p of pools) {
    activeWeeks.add(p.activeWeekNumber + 1);
    activeWeeks.add(p.activeWeekNumber + 2);
  }
  const weeksWithNonFinal = await prisma.game.groupBy({
    by: ["weekNumber"],
    where: { isFinal: false },
    _count: { _all: true },
  });
  const targetWeeks = Array.from(
    new Set([...activeWeeks, ...weeksWithNonFinal.map((g) => g.weekNumber)]),
  ).filter((w) => w >= 1 && w <= 22);

  const year = new Date().getFullYear();
  const results: Array<{ week: number; updated: number; created: number; error?: string }> = [];
  for (const wk of targetWeeks) {
    try {
      const games = await fetchEspnWeek(year, wk);
      let updated = 0;
      let created = 0;
      for (const g of games) {
        const result = await prisma.game.upsert({
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
        if (result.createdAt.getTime() === result.updatedAt.getTime()) created += 1;
        else updated += 1;
      }
      results.push({ week: wk, updated, created });
    } catch (e) {
      results.push({
        week: wk,
        updated: 0,
        created: 0,
        error: e instanceof Error ? e.message : "unknown",
      });
    }
  }

  // Auto-advance any pool whose active week is fully done.
  const advances: Array<{ pool: string; from: number; to: number }> = [];
  for (const p of pools) {
    const games = await prisma.game.findMany({ where: { weekNumber: p.activeWeekNumber } });
    if (games.length === 0 || !games.every((g) => g.isFinal)) continue;
    const next = p.activeWeekNumber + 1;
    if (next > 22) continue;
    // Only advance if at least one game exists for the next week — otherwise
    // we'd have an empty 'active' week which is pointless.
    const nextHas = await prisma.game.count({ where: { weekNumber: next } });
    if (nextHas === 0) continue;
    await prisma.pool.update({
      where: { id: p.id },
      data: { activeWeekNumber: next },
    });
    await prisma.activityLog.create({
      data: { poolId: p.id, message: `Active week advanced to Week ${next}` },
    });
    advances.push({ pool: p.slug, from: p.activeWeekNumber, to: next });
  }

  return NextResponse.json({ ok: true, weeks: targetWeeks, results, advances });
}
