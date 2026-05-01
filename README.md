# NFL Squares — Season Pool

A Super-Bowl-style squares pool that runs the full NFL regular season.

- Players claim squares **once for the whole season**.
- Digit headers (top + side) are **re-randomized every week**.
- Each week's winner = (last digit of all winning teams' total scores, last digit of all losing teams' total scores). The reverse pair (losers, winners) is a secondary winner.
- Multiple pools can run side-by-side and share NFL game data, but each pool has its own grid, participants, weekly digits, and payment ledger.
- **Player accounts** keep your squares and history tied to you across devices. Sign in with Google or username + password.
- **Admins** can manage games, randomize digits, edit payments, and promote other users. The first user to sign up is automatically made admin.

## Deploy to Vercel (free)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjeffgurrister-bit%2FNFL-Squares&env=AUTH_SECRET&envDescription=Random%20string%20used%20to%20sign%20session%20cookies.%20Generate%20with%3A%20openssl%20rand%20-base64%2032&project-name=nfl-squares&repository-name=nfl-squares&stores=%5B%7B%22type%22%3A%22postgres%22%7D%5D)

After clicking the button:

1. **Set `AUTH_SECRET`** when prompted. Generate a random string with `openssl rand -base64 32` (or any random 32+ character string).
2. **Provision Postgres** when prompted — Vercel will offer Neon (free) or Vercel Postgres. Either is fine. This auto-injects `DATABASE_URL`.
3. The first deploy applies migrations automatically (the build script runs `prisma migrate deploy`).
4. Visit your site and **click "Create an account"**. The first person to sign up automatically becomes admin.
5. Hand the URL to your players. They sign up the same way; you (the admin) can promote others later from the admin page if needed.

### Add "Sign in with Google" (optional)

If you want a one-click Google sign-in option for players:

1. Open https://console.cloud.google.com/apis/credentials in your browser (sign in with any Google account).
2. Click **Create Credentials → OAuth client ID**. Choose **Web application** as the type.
3. Under **Authorized JavaScript origins**, add your site URL: `https://your-app.vercel.app`.
4. Under **Authorized redirect URIs**, add: `https://your-app.vercel.app/api/auth/callback/google`.
5. Click **Create**. Copy the **Client ID** and **Client Secret**.
6. In your Vercel project: **Settings → Environment Variables**. Add:
   - `AUTH_GOOGLE_ID` = the Client ID
   - `AUTH_GOOGLE_SECRET` = the Client Secret
7. Click **Redeploy** in Vercel to pick up the new env vars.

The "Continue with Google" button will appear automatically on the login and signup pages.

### Custom domain

Vercel project → **Settings → Domains** → add a domain you own. Vercel handles SSL automatically.

## Local development

You need a Postgres database. Easiest options:

- **Neon** (https://neon.tech) — free serverless Postgres, no installation. Create a project and copy its connection string.
- **Docker** — `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=squares postgres:16`, then `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/squares`.

Then:

```bash
cp .env.example .env       # paste DATABASE_URL, set AUTH_SECRET (any random string)
npm install
npm run db:deploy          # apply migrations to your DB
npm run dev                # http://localhost:3000
```

To make schema changes:

```bash
# edit prisma/schema.prisma, then:
npm run db:migrate         # creates a new migration and applies it locally
git add prisma/migrations  # commit; Vercel applies it on next deploy
```

## Stack

Next.js 15 App Router · React 19 · TypeScript · Tailwind · Prisma + PostgreSQL · Auth.js (NextAuth v5).

See [CLAUDE.md](./CLAUDE.md) for architecture details.
