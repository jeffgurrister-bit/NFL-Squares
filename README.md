# NFL Squares — Season Pool

A Super-Bowl-style squares pool that runs the full NFL regular season.

- Players claim squares **once for the whole season**.
- Digit headers (top + side) are **re-randomized every week**.
- Each week's winner = (last digit of all winning teams' total scores, last digit of all losing teams' total scores). The reverse pair (losers, winners) is a secondary winner.
- Multiple pools can run side-by-side and share NFL game data, but each pool has its own grid, participants, weekly digits, and payment ledger.

## Deploy to Vercel (free)

The fastest path to a live site. Click below — Vercel will fork the repo to your GitHub, provision a free Postgres database, and deploy.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjeffgurrister-bit%2FNFL-Squares&env=ADMIN_PASSWORD&envDescription=Single%20shared%20password%20for%20the%20admin%20pages.%20Pick%20something%20strong.&project-name=nfl-squares&repository-name=nfl-squares&stores=%5B%7B%22type%22%3A%22postgres%22%7D%5D)

After deployment:

1. **Set `ADMIN_PASSWORD`** when prompted (you'll use this on `/p/<pool>/admin`).
2. **Provision Postgres** when prompted — this auto-injects `DATABASE_URL`. Vercel Postgres or Neon both work; either is free.
3. After the first deploy, open the **Deployment → Functions logs** to confirm the migration applied. The build script runs `prisma migrate deploy` automatically.
4. **Seed (optional).** From your local machine: `DATABASE_URL=<copied from Vercel> npm run db:seed` — this creates the sample "Smith Family" / "Main Pool" pools so you can see what the app looks like before creating your own. Skip this if you'd rather start from a clean slate.
5. **Custom domain (optional).** Vercel project → Settings → Domains. Add a domain you own and Vercel handles SSL automatically.

## Local development

You need a Postgres database. Easiest options:

- **Neon** (https://neon.tech) — free serverless Postgres. Create a project, copy its connection string into `.env`.
- **Docker** — `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=squares postgres:16` then `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/squares`.

Then:

```bash
cp .env.example .env       # paste your DATABASE_URL and set ADMIN_PASSWORD
npm install
npm run db:deploy          # apply migrations to your DB
npm run db:seed            # (optional) load sample pools + Week 1 games
npm run dev                # http://localhost:3000
```

To make schema changes:

```bash
# edit prisma/schema.prisma, then:
npm run db:migrate         # creates a new migration and applies it locally
git add prisma/migrations  # commit the migration; Vercel applies it on next deploy
```

## Stack

Next.js 15 App Router · React 19 · TypeScript · Tailwind · Prisma + PostgreSQL.

See [CLAUDE.md](./CLAUDE.md) for architecture details.
