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

export function UserManagement({ users }: { users: UserRow[] }) {
  return (
    <div className="card">
      <div className="mb-4">
        <h2 className="text-base font-bold text-ink">Registered Users</h2>
        <p className="mt-0.5 text-sm text-ink/60">
          Promote users to admin so they can manage games and payments. The first user to sign up
          is automatically made admin.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink/50">
            <tr className="border-b border-line">
              <th className="py-2 text-left">Name</th>
              <th className="py-2 text-left">Username</th>
              <th className="py-2 text-left">Email (Google)</th>
              <th className="py-2 text-left">Joined</th>
              <th className="py-2 text-left">Role</th>
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
              users.map((u) => <UserRowItem key={u.id} user={u} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRowItem({ user }: { user: UserRow }) {
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
      <td className="py-3 text-ink/70">{user.username ?? "—"}</td>
      <td className="py-3 text-ink/70">{user.email ?? "—"}</td>
      <td className="py-3 text-ink/60 text-xs">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      <td className="py-3">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={pending}
            onClick={toggle}
            className={isAdmin ? "btn-secondary" : "btn-gold"}
          >
            {isAdmin ? "Demote to player" : "Promote to admin"}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </td>
    </tr>
  );
}
