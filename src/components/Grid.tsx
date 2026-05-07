"use client";

import { useState } from "react";
import { parseDigits } from "@/lib/digits";

export type GridSquare = {
  row: number;
  col: number;
  participantId: string;
  participantName: string;
  color: string;
};

export type GridSelection = { row: number; col: number };

type Props = {
  squares: GridSquare[];
  rowDigits?: string | null;
  colDigits?: string | null;
  highlight?: { rowDigit?: number | null; colDigit?: number | null };
  reverseHighlight?: { rowDigit?: number | null; colDigit?: number | null };

  // Claim page (one-shot — kept for back-compat with anywhere still using it):
  onClaim?: (row: number, col: number) => Promise<void> | void;
  selectedParticipantId?: string | null;

  // Selection mode (the new claim flow): the parent owns a list of pending
  // (row, col) picks. Clicking an empty cell toggles its membership in the
  // list. Already-claimed cells are unaffected.
  selectedSquares?: GridSelection[];
  onToggleSelect?: (row: number, col: number) => void;
  selectionColor?: string;

  // When true, render the cell number (1-100) in empty cells. Helps players
  // refer to specific squares.
  showNumbers?: boolean;

  // When true, render small "WINNERS" / "LOSERS" axis labels above and to
  // the left of the digit headers. By convention in this app:
  //   col digits = winners' total last digit  (top label = WINNERS)
  //   row digits = losers'  total last digit  (left label = LOSERS)
  showAxisLabels?: boolean;

  size?: "sm" | "md";
};

export function Grid({
  squares,
  rowDigits,
  colDigits,
  highlight,
  reverseHighlight,
  onClaim,
  selectedParticipantId,
  selectedSquares,
  onToggleSelect,
  selectionColor,
  showNumbers,
  showAxisLabels,
  size = "md",
}: Props) {
  const occupied = new Map<string, GridSquare>();
  for (const s of squares) occupied.set(`${s.row},${s.col}`, s);

  const selected = new Set<string>();
  for (const s of selectedSquares ?? []) selected.add(`${s.row},${s.col}`);

  const rd = parseDigits(rowDigits ?? null);
  const cd = parseDigits(colDigits ?? null);
  const [pending, setPending] = useState<string | null>(null);

  const cellSize = size === "sm" ? "h-7 w-7 text-[10px] sm:h-9 sm:w-9" : "h-12 w-12 text-xs";
  const headerSize = size === "sm" ? "h-7 w-7 text-[11px] sm:h-9 sm:w-9 sm:text-xs" : "h-12 w-12 text-sm";

  const isHighlightRow = (i: number) =>
    rd && highlight?.rowDigit != null && rd[i] === highlight.rowDigit;
  const isHighlightCol = (j: number) =>
    cd && highlight?.colDigit != null && cd[j] === highlight.colDigit;
  const isReverseRow = (i: number) =>
    rd && reverseHighlight?.rowDigit != null && rd[i] === reverseHighlight.rowDigit;
  const isReverseCol = (j: number) =>
    cd && reverseHighlight?.colDigit != null && cd[j] === reverseHighlight.colDigit;

  const handleClick = async (row: number, col: number) => {
    const key = `${row},${col}`;
    if (occupied.has(key)) return;

    if (onToggleSelect) {
      onToggleSelect(row, col);
      return;
    }
    if (onClaim && selectedParticipantId) {
      setPending(key);
      try {
        await onClaim(row, col);
      } finally {
        setPending(null);
      }
    }
  };

  const cellNumber = (i: number, j: number) => i * 10 + j + 1;

  return (
    <div className="inline-block">
      {showAxisLabels && (
        <div className="mb-1 grid grid-cols-[auto_1fr] items-center gap-2">
          <div className={`${headerSize} invisible`} />
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-ink/60">
            Winners ↓
          </p>
        </div>
      )}
      <div className="flex items-center gap-1">
        {showAxisLabels && (
          <div className="flex h-full items-center">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/60"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              Losers →
            </p>
          </div>
        )}
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              <th className={headerSize} />
              {Array.from({ length: 10 }).map((_, j) => {
                const active = isHighlightCol(j) || isReverseCol(j);
                return (
                  <th
                    key={`ch-${j}`}
                    className={`${headerSize} rounded-md text-center font-semibold ${
                      active ? "bg-accent-gold text-ink" : "bg-line/60 text-ink/70"
                    }`}
                  >
                    {cd?.[j] ?? ""}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={`r-${i}`}>
                <th
                  className={`${headerSize} rounded-md text-center font-semibold ${
                    isHighlightRow(i) || isReverseRow(i)
                      ? "bg-accent-gold text-ink"
                      : "bg-line/60 text-ink/70"
                  }`}
                >
                  {rd?.[i] ?? ""}
                </th>
                {Array.from({ length: 10 }).map((_, j) => {
                  const key = `${i},${j}`;
                  const sq = occupied.get(key);
                  const isSelected = selected.has(key);
                  const winning = isHighlightRow(i) && isHighlightCol(j);
                  const reverse = isReverseRow(i) && isReverseCol(j);
                  const isPending = pending === key;
                  const clickable =
                    (onToggleSelect || (onClaim && selectedParticipantId)) && !sq;

                  let bg: string | undefined;
                  let label = "";
                  let extraClass = "border-line bg-white";
                  if (sq) {
                    bg = sq.color;
                    label = sq.participantName.slice(0, 5);
                    extraClass = "border-transparent text-ink/80";
                  } else if (isSelected) {
                    bg = selectionColor;
                    label = "PICK";
                    extraClass = "border-forest font-bold text-ink";
                  } else if (winning) {
                    extraClass = "border-accent-gold bg-accent-goldSoft";
                  } else if (reverse) {
                    extraClass = "border-forest bg-forest/10";
                  }

                  return (
                    <td key={`c-${i}-${j}`} className="p-0">
                      <button
                        type="button"
                        disabled={!clickable || isPending}
                        onClick={() => handleClick(i, j)}
                        style={bg ? { backgroundColor: bg } : undefined}
                        className={`${cellSize} grid place-items-center rounded-md border text-center font-medium transition ${extraClass} ${
                          clickable ? "hover:border-forest cursor-pointer" : "cursor-default"
                        }`}
                      >
                        {label || (showNumbers && !sq ? (
                          <span className="text-ink/30">{cellNumber(i, j)}</span>
                        ) : "")}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
