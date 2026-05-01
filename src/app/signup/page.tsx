import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignupForm } from "./SignupForm";
import { GoogleButton } from "../login/GoogleButton";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) redirect("/");
  const googleEnabled = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-forest text-sm font-bold text-white">
            SQ
          </span>
          <span className="text-2xl font-bold text-ink">NFL Squares</span>
        </Link>
        <h1 className="mt-6 text-3xl font-bold text-ink">Create an account</h1>
        <p className="mt-1 text-sm text-ink/60">
          Sign up so your squares and history stay tied to you across devices.
        </p>
      </div>

      <section className="card">
        {googleEnabled && (
          <>
            <GoogleButton />
            <div className="relative my-5 text-center text-[10px] font-semibold uppercase tracking-wide text-ink/40">
              <span className="bg-white px-2">or with username</span>
              <div className="absolute left-0 right-0 top-1/2 -z-0 border-t border-line" />
            </div>
          </>
        )}
        <SignupForm />
        <p className="mt-4 text-sm text-ink/70">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-forest underline">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
