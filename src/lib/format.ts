export function dollars(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString()}`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const PALETTE = [
  "#fecaca", // pink
  "#bbf7d0", // green
  "#bfdbfe", // blue
  "#fde68a", // amber
  "#ddd6fe", // violet
  "#fed7aa", // orange
  "#a7f3d0", // emerald
  "#fbcfe8", // fuchsia
  "#c7d2fe", // indigo
  "#fef08a", // yellow
];

export function pickColor(seedIndex: number): string {
  return PALETTE[seedIndex % PALETTE.length];
}
