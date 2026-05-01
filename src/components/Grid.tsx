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

type Props = {
  squares: GridSquare[];
  rowDigits?: string | null;
  colDigits?: string | null;
  highlight?: { rowDigit?: number | null; colDigit?: number | null };
  reverseHighlight?: { rowDigit?: number | null; colDigit?: number | null };
  onClaim?: (row: number, col: number) => Promise<void> | void;
  selectedParticipantId?: string | null;
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
  size = "md",
}: Props) {
  const occupied = new Map<string, GridSquare>();
  for (const s of squares) occupied.set(`${s.row},${s.col}`, s);

  const rd = parseDigits(rowDigits ?? null);
  const cd = parseDigits(colDigits ?? null);
  const [pending, setPending] = useState<string | null>(null);

  const cellSize = size === "sm" ? "h-9 w-9 text-[10px]" : "h-12 w-12 text-xs";
  const headerSize = size === "sm" ? "h-9 w-9 text-xs" : "h-12 w-12 text-sm";

  const isHighlightRow = (i: number) =>
    rd && highlight?.rowDigit != null && rd[i] === highlight.rowDigit;
  const isHighlightCol = (j: number) =>
    cd && highlight?.colDigit != null && cd[j] === highlight.colDigit;
  const isReverseRow = (i: number) =>
    rd && reverseHighlight?.rowDigit != null && rd[i] === reverseHighlight.rowDigit;
  const isReverseCol = (j: number) =>
    cd && reverseHighlight?.colDigit != null && cd[j] === reverseHighlight.colDigit;

  const handleClick = async (row: number, col: number) => {
    if (!onClaim) return;
    const key = `${row},${col}`;
    if (occupied.has(key) || !selectedParticipantId) return;
    setPending(key);
    try {
      await onClaim(row, col);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="inline-block">
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
                const sq = occupied.get(`${i},${j}`);
                const winning = isHighlightRow(i) && isHighlightCol(j);
                const reverse = isReverseRow(i) && isReverseCol(j);
                const isPending = pending === `${i},${j}`;
                const clickable = onClaim && !sq && selectedParticipantId;
                return (
                  <td key={`c-${i}-${j}`} className="p-0">
                    <button
                      type="button"
                      disabled={!clickable || isPending}
                      onClick={() => handleClick(i, j)}
                      style={sq ? { backgroundColor: sq.color } : undefined}
                      className={`${cellSize} grid place-items-center rounded-md border text-center font-medium transition ${
                        sq
                          ? "border-transparent text-ink/80"
                          : winning
                            ? "border-accent-gold bg-accent-goldSoft"
                            : reverse
                              ? "border-forest bg-forest/10"
                              : "border-line bg-white"
                      } ${clickable ? "hover:border-forest cursor-pointer" : "cursor-default"}`}
                    >
                      {sq ? sq.participantName.slice(0, 5) : ""}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
