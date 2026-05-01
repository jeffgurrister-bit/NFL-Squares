import type { Game } from "@prisma/client";

// Compute the running totals for a week.
// "Winners' total" = sum of the score of whichever team won each game.
// "Losers' total" = sum of the loser scores.
// Ties count both teams as losers (their score adds to the losers' total). This
// is an arbitrary call but matches the most-common house rule for squares
// pools; admins can adjust scores manually if they want different behavior.
export function weekTotals(games: Pick<Game, "awayScore" | "homeScore" | "isFinal">[]) {
  let winners = 0;
  let losers = 0;
  for (const g of games) {
    if (!g.isFinal || g.awayScore == null || g.homeScore == null) continue;
    if (g.awayScore > g.homeScore) {
      winners += g.awayScore;
      losers += g.homeScore;
    } else if (g.homeScore > g.awayScore) {
      winners += g.homeScore;
      losers += g.awayScore;
    } else {
      // tie: both go to losers' bucket
      losers += g.awayScore + g.homeScore;
    }
  }
  return {
    winners,
    losers,
    winnersDigit: winners % 10,
    losersDigit: losers % 10,
  };
}

export function allFinal(games: Pick<Game, "isFinal">[]): boolean {
  return games.length > 0 && games.every((g) => g.isFinal);
}
