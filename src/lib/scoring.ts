import type { Game } from "@prisma/client";

// Compute the running totals for a week.
// "Winners' total" = sum of the score of whichever team won each game.
// "Losers' total" = sum of the loser scores.
//
// Ties: per Jimmie's spec ("one team counts as a winner, one as a loser"),
// the HOME team's score goes to the winners' bucket and the AWAY team's
// score to the losers' bucket. Arbitrary but deterministic.
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
      // Tie: home goes to winners, away to losers (arbitrary convention).
      winners += g.homeScore;
      losers += g.awayScore;
    }
  }
  return {
    winners,
    losers,
    winnersDigit: winners % 10,
    losersDigit: losers % 10,
  };
}

// Total points scored across all games (used for the bonus-digit rollover).
export function pointsInWeek(games: Pick<Game, "awayScore" | "homeScore" | "isFinal">[]): number {
  let total = 0;
  for (const g of games) {
    if (!g.isFinal || g.awayScore == null || g.homeScore == null) continue;
    total += g.awayScore + g.homeScore;
  }
  return total;
}

export function allFinal(games: Pick<Game, "isFinal">[]): boolean {
  return games.length > 0 && games.every((g) => g.isFinal);
}
