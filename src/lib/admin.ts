import { cookies } from "next/headers";

const COOKIE_NAME = "nfl_squares_admin";

export async function isAdmin(): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const c = await cookies();
  return c.get(COOKIE_NAME)?.value === expected;
}

export async function setAdminCookie(password: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || password !== expected) return false;
  const c = await cookies();
  c.set(COOKIE_NAME, password, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return true;
}

export async function clearAdminCookie() {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}
