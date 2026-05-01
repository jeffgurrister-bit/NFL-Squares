"use server";

import { revalidatePath } from "next/cache";
import { setAdminCookie, clearAdminCookie } from "@/lib/admin";

export async function adminLogin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const ok = await setAdminCookie(password);
  revalidatePath("/", "layout");
  return { ok };
}

export async function adminLogout() {
  await clearAdminCookie();
  revalidatePath("/", "layout");
}
