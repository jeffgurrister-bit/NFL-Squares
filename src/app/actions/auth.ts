"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signIn, signOut } from "@/auth";

const USERNAME_RE = /^[a-z0-9_-]{3,32}$/;

export async function signUpWithCredentials(formData: FormData) {
  const usernameRaw = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("name") ?? "").trim() || usernameRaw;

  if (!USERNAME_RE.test(usernameRaw)) {
    return { error: "Username must be 3–32 chars: lowercase letters, numbers, _ or -." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { username: usernameRaw } });
  if (existing) return { error: "That username is taken." };

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { username: usernameRaw, name: displayName, passwordHash },
  });

  // Sign them in immediately. NextAuth's signIn server action throws a
  // redirect on success, so we let it propagate.
  await signIn("credentials", {
    username: usernameRaw,
    password,
    redirectTo: "/",
  });
  return { error: null };
}

export async function signInWithCredentials(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  try {
    await signIn("credentials", { username, password, redirectTo: "/" });
    return { error: null };
  } catch (e) {
    // signIn throws a redirect on success; let that bubble up. CredentialsSignin
    // is the only failure path we care to surface.
    if (e instanceof Error && e.name === "CredentialsSignin") {
      return { error: "Wrong username or password." };
    }
    throw e;
  }
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function setUserAdmin(userId: string, isAdmin: boolean) {
  // Caller (admin page) is verified via session.user.isAdmin server-side
  // before this is ever invoked. We additionally guard the actor:
  const { auth } = await import("@/auth");
  const session = await auth();
  const actorIsAdmin = !!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
  if (!actorIsAdmin) throw new Error("Admin only.");

  if (!isAdmin) {
    const adminCount = await prisma.user.count({ where: { isAdmin: true } });
    if (adminCount <= 1) throw new Error("Can't remove the last admin.");
  }
  await prisma.user.update({ where: { id: userId }, data: { isAdmin } });
  revalidatePath("/", "layout");
}

// Bootstrap action: lets the signed-in user claim admin if and ONLY if no
// admin exists yet. Idempotent; becomes a no-op once any admin is set, so
// it's safe to leave the button visible without worrying about coups.
export async function claimFirstAdmin() {
  const { auth } = await import("@/auth");
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const existingAdmin = await prisma.user.findFirst({ where: { isAdmin: true } });
  if (existingAdmin) {
    throw new Error("An admin already exists. Ask them to promote you.");
  }
  await prisma.user.update({ where: { id: userId }, data: { isAdmin: true } });
  revalidatePath("/", "layout");
}

export async function changePassword(currentPassword: string, newPassword: string) {
  // Used by signed-in users to rotate their own password.
  const { auth } = await import("@/auth");
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");
  if (newPassword.length < 8) throw new Error("New password must be at least 8 characters.");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    throw new Error("This account doesn't use a password (signed in via Google).");
  }
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw new Error("Current password is wrong.");
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
