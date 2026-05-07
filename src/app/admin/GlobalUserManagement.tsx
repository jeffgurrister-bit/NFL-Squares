"use client";

import { useMemo, useState } from "react";
import { setUserAdmin } from "@/app/actions/auth";
import { dollars } from "@/lib/format";

export type UserStatRow = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  isAdmin: boolean;
  createdAt: string;
  pools: number;
  squares: number;
  entryOwed: number;
  entryPaid: number;
  won: number;
  paidOut: number;
  poolNames: string[];
};

export function GlobalUserManagement({ users }: { users: UserStatRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const haystack = [u.name, u.username, u.email, ...u.poolNames]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [users, query]);

  function downloadCsv() {
    const header = [
      "Name",
      "Username",
      "Email",
      "Admin",
      "Joined",
      "Pools",
      "Squares",
      "Entry Owed",
      "Entry Paid",
      "Entry Outstanding",
      "Won",
      "Paid Out",
      "Balance",
      "Pool Names",
    ];
    const rows = users.map((u) => [
      u.name ?? "",
      u.username ?? "",
      u.email ?? "",
      u.isAdmin ? "yes" : "no",
      new Date(u.createdAt).toISOString().slice(0, 10),
      String(u.pools),
      String(u.squares),
      String(u.entryOwed),
      String(u.entryPaid),
      String(u.entryOwed - u.entryPaid),
      String(u.won),
      String(u.paidOut),
      String(u.won - u.paidOut),
      u.poolNames.join("; "),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map(csvEscape).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `nfl-squares-users-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Users</h2>
          <p className="text-sm text-ink/60">
            Across all pools. Promote players to admin or export the contact list.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="input w-44"
          />
          <button type="button" onClick={downloadCsv} className="btn-secondary">
            Download CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink/50">
            <tr className="border-b border-line">
              <th className="py-2 pr-3 text-left">Name</th>
              <th className="py-2 pr-3 text-left">Contact</th>
              <th className="py-2 pr-3 text-right">Pools</th>
              <th className="py-2 pr-3 text-right">Squares</th>
              <th className="py-2 pr-3 text-right">Entry (paid / owed)</th>
              <th className="py-2 pr-3 text-right">Won</th>
              <th className="py-2 pr-3 text-right">Paid out</th>
              <th className="py-2 pr-3 text-left">Role</th>
              <th className="py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-6 text-center text-ink/60">
                  No matching users.
                </td>
              </tr>
            ) : (
              filtered.map((u) => <Row key={u.id} user={u} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ user }: { user: UserStatRow }) {
  const [pending, setPending] = useState(false);
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);
    try {
      await setUserAdmin(user.id, !isAdmin);
      setIsAdmin(!isAdmin);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  const entryShort = user.entryOwed - user.entryPaid;

  return (
    <tr className="border-b border-line last:border-0 align-top">
      <td className="py-3 pr-3">
        <p className="font-semibold text-ink">{user.name ?? "—"}</p>
        {user.poolNames.length > 0 && (
          <p className="mt-0.5 text-[11px] text-ink/50">{user.poolNames.join(", ")}</p>
        )}
      </td>
      <td className="py-3 pr-3 text-ink/70">
        {user.username && <p>{user.username}</p>}
        {user.email && user.email !== user.username && (
          <p className="text-xs text-ink/50">{user.email}</p>
        )}
        {!user.username && !user.email && <span className="text-ink/40">—</span>}
      </td>
      <td className="py-3 pr-3 text-right text-ink">{user.pools}</td>
      <td className="py-3 pr-3 text-right text-ink">{user.squares}</td>
      <td className="py-3 pr-3 text-right">
        <span className="text-ink">{dollars(user.entryPaid)}</span>
        <span className="text-ink/40"> / </span>
        <span className="text-ink/70">{dollars(user.entryOwed)}</span>
        {entryShort > 0 && (
          <p className="text-[11px] text-red-600">{dollars(entryShort)} short</p>
        )}
      </td>
      <td className="py-3 pr-3 text-right text-ink">{dollars(user.won)}</td>
      <td className="py-3 pr-3 text-right text-ink">{dollars(user.paidOut)}</td>
      <td className="py-3 pr-3">
        {isAdmin ? (
          <span className="badge bg-accent-goldSoft text-ink">Admin</span>
        ) : (
          <span className="badge bg-line/60 text-ink/70">Player</span>
        )}
      </td>
      <td className="py-3 text-right">
        <button
          type="button"
          disabled={pending}
          onClick={toggle}
          className={isAdmin ? "btn-secondary" : "btn-gold"}
        >
          {pending ? "..." : isAdmin ? "Demote" : "Promote"}
        </button>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
    </tr>
  );
}

function csvEscape(s: string): string {
  if (s == null) return "";
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
