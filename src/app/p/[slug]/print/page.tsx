import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Grid, type GridSquare } from "@/components/Grid";
import { dollars } from "@/lib/format";
import { weekTotals, allFinal } from "@/lib/scoring";
import { cellForDigitPair } from "@/lib/digits";
import { bonusStateForWeek } from "@/lib/payouts";
import { PrintTrigger } from "./PrintTrigger";

// Compact single-page view of a pool's current-week grid, designed to fit on
// one screen (or one letter-sized sheet) for screenshotting or printing.
// No nav chrome, no scroll — everything sized down so the 10x10 grid + prize
// summary + digit headers all fit together.
export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ wk?: string }>;
}) {
  const { slug } = await params;
  const { wk } = await searchParams;
  const pool = await prisma.pool.findUnique({
    where: { slug },
    include: {
      squares: { include: { participant: true } },
      poolWeeks: true,
    },
  });
  if (!pool) notFound();

  const weekNumber = wk ? Math.max(1, Math.min(22, Number(wk))) : pool.activeWeekNumber;
  const pw = pool.poolWeeks.find((w) => w.weekNumber === weekNumber);
  const games = await prisma.game.findMany({ where: { weekNumber } });
  const totals = weekTotals(games);
  const isComplete = allFinal(games) && games.length > 0;

  const gridSquares: GridSquare[] = pool.squares.map((s) => ({
    row: s.row,
    col: s.col,
    participantId: s.participantId,
    participantName: s.participant.name,
    color: s.participant.color,
  }));

  const winningCell = isComplete && pw?.rowDigits && pw?.colDigits
    ? cellForDigitPair(pw.rowDigits, pw.colDigits, totals.losersDigit, totals.winnersDigit)
    : null;
  const adjacentCells = winningCell
    ? [
        { row: winningCell.row - 1, col: winningCell.col },
        { row: winningCell.row + 1, col: winningCell.col },
        { row: winningCell.row, col: winningCell.col - 1 },
        { row: winningCell.row, col: winningCell.col + 1 },
      ].filter((c) => c.row >= 0 && c.row <= 9 && c.col >= 0 && c.col <= 9)
    : [];

  const bonus = pool.bonusDigitPrize > 0
    ? await bonusStateForWeek(pool.id, weekNumber)
    : { digit: 0, pot: 0 };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 print:py-3">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">{pool.name}</h1>
          <p className="mt-0.5 text-xs text-ink/60">
            Week {weekNumber}
            {pw?.rowDigits ? " · digits randomized" : " · digits pending"}
            {isComplete && ` · winners ${totals.winners} (${totals.winnersDigit}), losers ${totals.losers} (${totals.losersDigit})`}
          </p>
        </div>
        <PrintTrigger />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <Prize label="Exact winner" value={dollars(pool.weeklyPrize)} />
        {pool.reverseWeeklyPrize > 0 && (
          <Prize label="Reverse" value={dollars(pool.reverseWeeklyPrize)} />
        )}
        {pool.adjacentPrize > 0 && (
          <Prize label="Adjacents (each)" value={dollars(pool.adjacentPrize)} />
        )}
        {pool.bonusDigitPrize > 0 && (
          <Prize
            label={`Bonus (digit ${bonus.digit})`}
            value={dollars(bonus.pot)}
          />
        )}
      </div>

      <div className="flex justify-center overflow-x-auto">
        <Grid
          squares={gridSquares}
          rowDigits={pw?.rowDigits}
          colDigits={pw?.colDigits}
          highlight={
            isComplete
              ? { rowDigit: totals.losersDigit, colDigit: totals.winnersDigit }
              : undefined
          }
          reverseHighlight={
            isComplete
              ? { rowDigit: totals.winnersDigit, colDigit: totals.losersDigit }
              : undefined
          }
          adjacentCells={pool.adjacentPrize > 0 ? adjacentCells : []}
          showAxisLabels
          showNumbers
          size="sm"
        />
      </div>

      <p className="mt-3 text-center text-[10px] text-ink/50 print:text-[9px]">
        Winners across the top · losers down the left · #N = square number ·
        gold outline = exact winner · green outline = reverse · faint gold = adjacent
      </p>
    </main>
  );
}

function Prize({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white px-2 py-1">
      <p className="text-[10px] uppercase tracking-wide text-ink/50">{label}</p>
      <p className="text-sm font-bold text-ink">{value}</p>
    </div>
  );
}
