"use client";

import { useState } from "react";
import { setUserAdmin } from "@/app/actions/auth";

type UserRow = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  isAdmin: boolean;
  createdAt: string;
};

export function GlobalUserManagement({ users }: { users: UserRow[] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-ink/50">
          <tr className="border-b border-line">
            <th className="py-2 text-left">Name</th>
            <th className="py-2 text-left">Username / Email</th>
            <th className="py-2 text-left">Joined</th>
            <th className="py-2 text-left">Role</th>
            <th className="py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-6 text-center text-ink/60">
                No users yet.
              </td>
            </tr>
          ) : (
            users.map((u) => <Row key={u.id} user={u} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

function Row({ user }: { user: UserRow }) {
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

  return (
    <tr className="border-b border-line last:border-0">
      <td className="py-3 font-semibold text-ink">{user.name ?? "—"}</td>
      <td className="py-3 text-ink/70">
        {user.username ?? "—"}
        {user.email && user.email !== user.username && (
          <span className="ml-2 text-xs text-ink/50">{user.email}</span>
        )}
      </td>
      <td className="py-3 text-xs text-ink/60">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      <td className="py-3">
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
          {pending ? "..." : isAdmin ? "Demote" : "Promote to admin"}
        </button>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
    </tr>
  );
}
