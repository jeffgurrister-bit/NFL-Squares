import Link from "next/link";
import { auth } from "@/auth";
import { signOutAction } from "@/app/actions/auth";

export async function PoolHeader({
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
  const session = await auth();
  const user = session?.user as { name?: string | null; isAdmin?: boolean } | undefined;
  const isAdmin = !!user?.isAdmin;

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
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href={base} className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-forest text-xs font-bold text-white">
            SQ
          </span>
          <span className="text-lg font-bold text-ink">{poolName}</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {navItem("Grid", base, "grid")}
          {navItem("Claim", `${base}/claim`, "claim")}
          {navItem(`Wk ${activeWeek}`, `${base}/week/${activeWeek}`, "week")}
          {navItem("History", `${base}/history`, "history")}
          {isAdmin && navItem("Admin", `${base}/admin`, "admin")}
          <Link href="/" className="rounded-md border border-line px-3 py-1 text-ink/70 hover:bg-surface">
            My pools
          </Link>
          {user ? (
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-xs font-semibold text-ink/60 hover:text-ink"
                title={`Signed in as ${user.name ?? "you"}`}
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link href="/login" className="text-sm font-semibold text-forest">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
