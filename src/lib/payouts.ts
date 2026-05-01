import { prisma } from "./db";
import { cellForDigitPair } from "./digits";
import { weekTotals, allFinal } from "./scoring";

// Returns total winnings (in dollars) earned by each participant in a pool
// across all completed weeks. A week counts as completed if all of its games
// are final and the pool's digit headers for that week have been randomized.
//
// Convention used here:
//   row digit = winners' total last digit
//   col digit = losers' total last digit
//   reverse  = swapped (row=losers, col=winners)
export async function computeWinningsByParticipant(poolId: string): Promise<Map<string, number>> {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      poolWeeks: true,
      squares: { include: { participant: true } },
    },
  });
  if (!pool) return new Map();

  const totals = new Map<string, number>();
  const squareAt = new Map<string, string>(); // "row,col" -> participantId
  for (const sq of pool.squares) squareAt.set(`${sq.row},${sq.col}`, sq.participantId);

  for (const pw of pool.poolWeeks) {
    if (!pw.rowDigits || !pw.colDigits) continue;
    const games = await prisma.game.findMany({ where: { weekNumber: pw.weekNumber } });
    if (!allFinal(games)) continue;
    const { winnersDigit, losersDigit } = weekTotals(games);

    const winningCell = cellForDigitPair(pw.rowDigits, pw.colDigits, winnersDigit, losersDigit);
    const reverseCell = cellForDigitPair(pw.rowDigits, pw.colDigits, losersDigit, winnersDigit);

    if (winningCell) {
      const pid = squareAt.get(`${winningCell.row},${winningCell.col}`);
      if (pid) totals.set(pid, (totals.get(pid) ?? 0) + pool.weeklyPrize);
    }
    if (reverseCell) {
      const pid = squareAt.get(`${reverseCell.row},${reverseCell.col}`);
      if (pid) totals.set(pid, (totals.get(pid) ?? 0) + pool.reverseWeeklyPrize);
    }
  }
  return totals;
}

export async function computePaidOutByParticipant(poolId: string): Promise<Map<string, number>> {
  const payments = await prisma.payment.findMany({ where: { poolId } });
  const map = new Map<string, number>();
  for (const p of payments) map.set(p.participantId, (map.get(p.participantId) ?? 0) + p.amount);
  return map;
}
