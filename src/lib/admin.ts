import { auth } from "@/auth";

// True if the current session belongs to an admin user. Used to gate the
// admin pages and to bypass per-pool membership checks.
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return !!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
}

export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return ((session?.user as { id?: string } | undefined)?.id) ?? null;
}

// Throws if the caller isn't an admin. Use at the top of every admin-only
// Server Action — the UI can be tampered with, but Server Actions hit this
// before doing any DB work. Returns the user id for convenience.
export async function requireAdmin(): Promise<string> {
  const session = await auth();
  const u = session?.user as { id?: string; isAdmin?: boolean } | undefined;
  if (!u?.id) throw new Error("Sign in required.");
  if (!u.isAdmin) throw new Error("Admin only.");
  return u.id;
}

