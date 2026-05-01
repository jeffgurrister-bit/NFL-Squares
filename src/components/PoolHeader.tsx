import Link from "next/link";

export function PoolHeader({
  poolName,
  poolSlug,
  activeWeek,
  current,
}: {
  poolName: string;
  poolSlug: string;
  activeWeek: number;
  current: "grid" | "claim" | "week" | "history" | "admin";
}) {
  const base = `/p/${poolSlug}`;
  const navItem = (label: string, href: string, key: typeof current) =>
    current === key ? (
      <span className="font-semibold text-ink">{label}</span>
    ) : (
      <Link href={href} className="text-ink/60 hover:text-ink">
        {label}
      </Link>
    );
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href={base} className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-forest text-xs font-bold text-white">
            SQ
          </span>
          <span className="text-lg font-bold text-ink">{poolName}</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          {navItem("Grid", base, "grid")}
          {navItem("Claim", `${base}/claim`, "claim")}
          {navItem(`Wk ${activeWeek}`, `${base}/week/${activeWeek}`, "week")}
          {navItem("History", `${base}/history`, "history")}
          {navItem("Admin", `${base}/admin`, "admin")}
          <Link href="/" className="rounded-md border border-line px-3 py-1 text-ink/70 hover:bg-surface">
            Switch pool
          </Link>
        </nav>
      </div>
    </header>
  );
}
