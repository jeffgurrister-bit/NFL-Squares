import { prisma } from "./db";
import { cellForDigitPair } from "./digits";
import { weekTotals, pointsInWeek, allFinal } from "./scoring";

// Convention (matches the displayed grid):
//   col digit = winners' total last digit  (rendered along the TOP)
//   row digit = losers'  total last digit  (rendered along the LEFT)
//   reverse   = swapped (col=losers, row=winners)
//
// Prize structure (from Pool):
//   weeklyPrize        → exact winner
//   reverseWeeklyPrize → reverse cell
//   adjacentPrize      → each of the 4 orthogonal neighbors of the exact winner
//   bonusDigitPrize    → per-week bonus added to a running pot; the exact winner
//                        claims the pot if the bonus digit matches either their
//                        winners' or losers' digit. Pot rolls over otherwise.
//                        Bonus digit for a given week = last digit of the sum
//                        of ALL game scores in EARLIER completed weeks. Week 1
//                        starts with bonus digit 0 (no prior weeks).

const NEIGHBORS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

function adjacentCells(row: number, col: number): Array<{ row: number; col: number }> {
  return NEIGHBORS
    .map(([dr, dc]) => ({ row: row + dr, col: col + dc }))
    .filter((c) => c.row >= 0 && c.row <= 9 && c.col >= 0 && c.col <= 9);
}

export async function computeWinningsByParticipant(poolId: string): Promise<Map<string, number>> {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      poolWeeks: { orderBy: { weekNumber: "asc" } },
      squares: { include: { participant: true } },
    },
  });
  if (!pool) return new Map();

  const totals = new Map<string, number>();
  const squareAt = new Map<string, string>(); // "row,col" -> participantId
  for (const sq of pool.squares) squareAt.set(`${sq.row},${sq.col}`, sq.participantId);

  // Track season-wide points scored across ALL completed weeks (in weekNumber
  // order) so we can compute each week's bonus digit from prior-week totals.
  let seasonPointsBefore = 0; // running total up to but not including the current pw
  let bonusPot = 0; // accumulates when the bonus isn't won

  for (const pw of pool.poolWeeks) {
    if (!pw.rowDigits || !pw.colDigits) continue;
    const games = await prisma.game.findMany({ where: { weekNumber: pw.weekNumber } });
    if (!allFinal(games)) continue;

    const { winnersDigit, losersDigit } = weekTotals(games);
    const winningCell = cellForDigitPair(pw.rowDigits, pw.colDigits, losersDigit, winnersDigit);
    const reverseCell = cellForDigitPair(pw.rowDigits, pw.colDigits, winnersDigit, losersDigit);

    // This week's bonus digit is derived from EARLIER weeks' totals only.
    const bonusDigitThisWeek = seasonPointsBefore % 10;
    // Each completed week contributes its base amount to the running bonus pot.
    bonusPot += pool.bonusDigitPrize;

    // Exact winner
    if (winningCell) {
      const pid = squareAt.get(`${winningCell.row},${winningCell.col}`);
      if (pid) totals.set(pid, (totals.get(pid) ?? 0) + pool.weeklyPrize);

      // Bonus: if the bonus digit matches either digit of the winning ID, the
      // exact winner also collects the current pot; then the pot resets.
      const bonusHit = winnersDigit === bonusDigitThisWeek || losersDigit === bonusDigitThisWeek;
      if (bonusHit && pid && bonusPot > 0) {
        totals.set(pid, (totals.get(pid) ?? 0) + bonusPot);
        bonusPot = 0;
      }
    }

    // Reverse winner
    if (reverseCell) {
      const pid = squareAt.get(`${reverseCell.row},${reverseCell.col}`);
      if (pid) totals.set(pid, (totals.get(pid) ?? 0) + pool.reverseWeeklyPrize);
    }

    // Adjacents (of the exact winner). No adjacents for the reverse cell.
    if (winningCell && pool.adjacentPrize > 0) {
      for (const adj of adjacentCells(winningCell.row, winningCell.col)) {
        const pid = squareAt.get(`${adj.row},${adj.col}`);
        if (pid) totals.set(pid, (totals.get(pid) ?? 0) + pool.adjacentPrize);
      }
    }

    // Roll THIS week's points into the running total for NEXT week's bonus.
    seasonPointsBefore += pointsInWeek(games);
  }
  return totals;
}

export async function computePaidOutByParticipant(poolId: string): Promise<Map<string, number>> {
  const payments = await prisma.payment.findMany({ where: { poolId } });
  const map = new Map<string, number>();
  for (const p of payments) map.set(p.participantId, (map.get(p.participantId) ?? 0) + p.amount);
  return map;
}

// Returns the bonus digit + accumulated pot heading into a given weekNumber
// (i.e., what THAT week's exact winner is playing for). Used to display
// "bonus digit: N · pot: $X" on the week page.
export async function bonusStateForWeek(poolId: string, weekNumber: number): Promise<{
  digit: number;
  pot: number;
}> {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: { poolWeeks: { orderBy: { weekNumber: "asc" } } },
  });
  if (!pool) return { digit: 0, pot: 0 };

  let seasonPointsBefore = 0;
  let bonusPot = 0;

  for (const pw of pool.poolWeeks) {
    if (pw.weekNumber >= weekNumber) break;
    if (!pw.rowDigits || !pw.colDigits) continue;
    const games = await prisma.game.findMany({ where: { weekNumber: pw.weekNumber } });
    if (!allFinal(games)) continue;

    const { winnersDigit, losersDigit } = weekTotals(games);
    const bonusDigit = seasonPointsBefore % 10;
    bonusPot += pool.bonusDigitPrize;
    const hit = winnersDigit === bonusDigit || losersDigit === bonusDigit;
    if (hit) bonusPot = 0;
    seasonPointsBefore += pointsInWeek(games);
  }

  // Now bonusPot is what THIS week starts with (before adding its base) and
  // bonusDigit is derived from all points through the prior week.
  return {
    digit: seasonPointsBefore % 10,
    // The target week's contribution hasn't been added yet; the "prize on offer"
    // this week is the pot + the target week's base.
    pot: bonusPot + pool.bonusDigitPrize,
  };
}
