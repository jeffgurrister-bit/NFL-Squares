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
