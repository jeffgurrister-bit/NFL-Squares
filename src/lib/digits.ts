// Helpers for the per-week randomized digit headers.
//
// We store digits as a 10-char string of digits 0-9 with no repeats. Each
// position i in the string maps row index i (or col index i) to a digit.
// e.g. "1473605289" means row 0 -> digit 1, row 1 -> digit 4, etc.

export type DigitOrder = string; // length 10, digits 0-9 each appearing once

export function randomDigits(): DigitOrder {
  const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

export function parseDigits(s: string | null | undefined): number[] | null {
  if (!s || s.length !== 10) return null;
  const out: number[] = [];
  for (const c of s) {
    const d = Number(c);
    if (Number.isNaN(d) || d < 0 || d > 9) return null;
    out.push(d);
  }
  return out;
}

// Given the digit-order strings for rows and cols, find which (row, col) cell
// corresponds to a particular (rowDigit, colDigit) pair.
// Returns null if either digit isn't found in its respective header.
export function cellForDigitPair(
  rowDigits: DigitOrder | null,
  colDigits: DigitOrder | null,
  rowDigit: number,
  colDigit: number,
): { row: number; col: number } | null {
  const rows = parseDigits(rowDigits);
  const cols = parseDigits(colDigits);
  if (!rows || !cols) return null;
  const row = rows.indexOf(rowDigit);
  const col = cols.indexOf(colDigit);
  if (row === -1 || col === -1) return null;
  return { row, col };
}
