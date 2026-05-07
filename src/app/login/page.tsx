import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./LoginForm";
import { GoogleButton } from "./GoogleButton";

// Whitelist a `next` value to in-app paths only — no scheme, no host, no
// protocol-relative — to prevent open-redirect mischief via the URL.
function safeNext(raw?: string): string | undefined {
  if (!raw) return undefined;
  if (!raw.startsWith("/")) return undefined;
  if (raw.startsWith("//")) return undefined;
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (session?.user) redirect(next ?? "/");
  const googleEnabled = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-12">
      <div className="mb-10 text-center">
        <Link href="/" className="inline-flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-forest text-sm font-bold text-white">
            SQ
          </span>
          <span className="text-2xl font-bold text-ink">NFL Squares</span>
        </Link>
        <h1 className="mt-6 text-3xl font-bold text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-ink/60">Sign in to manage your squares.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Player section (primary) */}
        <section className="card">
          <div className="mb-1 flex items-center gap-2">
            <span className="badge bg-forest/10 text-forest">Players</span>
            <h2 className="text-lg font-bold text-ink">Sign in to play</h2>
          </div>
          <p className="text-sm text-ink/60">
            Use your account to claim squares and track your winnings across pools.
          </p>

          {googleEnabled && (
            <>
              <div className="mt-5">
                <GoogleButton next={next} />
              </div>
              <div className="relative my-5 text-center text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                <span className="bg-white px-2">or with username</span>
                <div className="absolute left-0 right-0 top-1/2 -z-0 border-t border-line" />
              </div>
            </>
          )}

          <LoginForm next={next} />

          <p className="mt-4 text-sm text-ink/70">
            New here?{" "}
            <Link
              href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
              className="font-semibold text-forest underline"
            >
              Create an account
            </Link>
          </p>
        </section>

        {/* Admin section (smaller, secondary) */}
        <aside className="card border-line bg-surface">
          <div className="mb-1 flex items-center gap-2">
            <span className="badge bg-accent-goldSoft text-ink">Admin</span>
            <h2 className="text-base font-bold text-ink">Admin sign in</h2>
          </div>
          <p className="text-sm text-ink/60">
            Admins can manage games, randomize digits, and record payments.
          </p>
          <p className="mt-4 text-sm text-ink/70">
            Admin uses the same sign-in form. After signing in, the <strong>Admin</strong> tab
            appears in your nav automatically.
          </p>
          <p className="mt-3 text-xs text-ink/50">
            The first person to sign up on a fresh deployment is automatically made admin.
            Existing admins can promote others from the admin page.
          </p>
        </aside>
      </div>
    </main>
  );
}
