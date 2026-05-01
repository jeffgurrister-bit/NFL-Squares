# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A season-long NFL Squares pool. Unlike a typical Super Bowl squares grid, players claim squares **once for the whole season**; the digit headers along the top and side of the grid are **re-randomized every week**. Each week, the winning square is determined by combining the scores of all winning teams that week, combining all losing teams' scores separately, and using the last digit of each as the (winners-digit, losers-digit) pair. The reverse pair (losers-digit, winners-digit) is a secondary winner.

The app supports multiple independent pools that share NFL game data but have their own participants, squares, weekly digits, and payment ledgers.

## Common commands

```bash
npm run dev         # Next.js dev server on :3000
npm run build       # runs `prisma migrate deploy` then `next build` (used in CI / Vercel)
npm run lint        # next lint
npm run db:migrate  # create + apply a new migration locally (interactive)
npm run db:deploy   # apply all pending migrations (used in production builds)
npm run db:seed     # load sample pools (Smith Family, Main Pool) + Week 1 games
npm run db:reset    # nuke DB, re-apply migrations, re-seed (handy after schema changes)
```

`npm install` triggers `prisma generate` automatically via the `postinstall` hook, so the schema must exist before installs work.

Required env vars (see `.env.example`):
- `DATABASE_URL` — Postgres connection string. On Vercel, auto-injected by the Postgres integration.
- `AUTH_SECRET` — random string used by Auth.js to sign session JWTs. Generate with `openssl rand -base64 32`.
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — optional. If both set, "Sign in with Google" appears on login/signup pages. If unset, only username/password login is offered (the app still works).

## Deployment

The repo is wired for Vercel + Postgres. The README has a one-click "Deploy to Vercel" button that:
1. Forks the repo to the user's GitHub
2. Prompts for `AUTH_SECRET`
3. Provisions a Postgres store (auto-injects `DATABASE_URL`)
4. Runs `npm run build` — which runs `prisma migrate deploy` before `next build`, so migrations in `prisma/migrations/` are applied on every deploy

If you change the schema, **always commit a new migration** under `prisma/migrations/<timestamp>_<name>/migration.sql` (use `npm run db:migrate` to generate). The `migration_lock.toml` file pins the provider to `postgresql` — don't switch providers without intent.

## Architecture

### Data model (`prisma/schema.prisma`)

Three layers — auth, global game data, and per-pool gameplay.

- **Auth (Auth.js / NextAuth v5):** `User` — global account with optional `email` (Google) and/or `username` + `passwordHash` (credentials). `User.isAdmin` is the admin flag. `Account` links a `User` to OAuth providers.
- **Global (shared across all pools):** `Game` — one row per NFL game, identified by `weekNumber + teams` (or `espnId` if imported). Game scores entered on any pool's admin page affect every pool.
- **Pool-scoped:** `Pool`, `Participant`, `Square`, `PoolWeek`, `Payment`, `ActivityLog`. Each `Pool` randomizes its own weekly digits independently.

Key invariants:
- A `User` joining a `Pool` creates a `Participant` row with a per-pool display name + color. Each `(poolId, userId)` is unique — one participant per user per pool.
- A `Square` is `(poolId, row, col)` with `row`/`col` fixed 0–9 indexes for the season. The participant of the square never changes after claim.
- A `PoolWeek` stores `rowDigits` and `colDigits` as 10-character strings of digits 0–9, no repeats — e.g. `"1473605289"`. Position `i` in the string gives the digit shown at row (or column) index `i` for that week. `null` until the admin clicks "Randomize digits".
- `Payment` is an append-only ledger of admin-recorded payouts. **Winnings are never persisted** — they are recomputed on every render from games + week digits + squares. This means changing a game score retroactively updates the entire payment balance for any affected pool.

### The winner-calculation pipeline

The flow from game results to a winning square lives in three files and is called from multiple pages. Convention used everywhere: **row digit = winners' total last digit, col digit = losers' total last digit.**

1. `src/lib/scoring.ts::weekTotals(games)` — sums up winning-team and losing-team scores across an array of games for a week, returning `{ winners, losers, winnersDigit, losersDigit }`. Ties count both teams as losers (an arbitrary house rule; documented in the file).
2. `src/lib/digits.ts::cellForDigitPair(rowDigits, colDigits, rowDigit, colDigit)` — translates a (digit, digit) pair into the `(row, col)` cell on the grid given that week's randomized digit headers. Returns `null` if either string is missing/malformed.
3. `src/lib/payouts.ts::computeWinningsByParticipant(poolId)` — iterates every `PoolWeek`, finds completed weeks (all games final + digits randomized), maps the winning + reverse cells back to participants via the `Square` table, and sums each participant's total winnings using the pool's `weeklyPrize` and `reverseWeeklyPrize`.

If you need to change scoring rules (e.g. ties, half-time scores, special weeks), `weekTotals` is the only place to touch.

### Routing and page layout

The app uses the Next.js App Router with the following structure:

- `/` — landing page for logged-out users; dashboard with mini-grid previews of joined pools for logged-in users (and all pools if admin)
- `/login` — sign-in page; two visual sections (Player / Admin) but one auth backend
- `/signup` — credentials sign-up
- `/api/auth/[...nextauth]` — NextAuth handlers (Google OAuth callback lands here)
- `/p/[slug]` — pool home; shows "Join pool" CTA if user isn't a participant yet
- `/p/[slug]/claim` — claim page (color picker, click empty cells)
- `/p/[slug]/week/[n]` — single-week view (games list, mini grid, running totals)
- `/p/[slug]/history` — past completed weeks, with `?wk=N` query for selection
- `/p/[slug]/admin` — gated on `User.isAdmin`; payments table + week manager + user management

`src/app/p/[slug]/layout.tsx` validates the slug exists, redirects to `/login` if no session. Every page-level component fetches its own data via `prisma` directly — there is no separate API layer. Mutations go through **Server Actions** in `src/app/actions/*.ts`:

- `auth.ts` — sign up / sign in / sign out, promote/demote admins, change password
- `pools.ts` — create new pool (admin-only; auto-slugifies, ensures uniqueness)
- `squares.ts` — `joinPool` (creates Participant), `claimSquare` (auto-joins if needed), `unclaimSquare` (admin), `setParticipantColor`
- `weeks.ts` — randomize digits, set active week, save game score, add/delete game, ESPN import
- `payments.ts` — record payment

### Auth model (Auth.js v5)

`src/auth.ts` configures NextAuth with two providers:
- **Credentials** — username + bcrypt-hashed password. Username must match `^[a-z0-9_-]{3,32}$`. Sign-up validates and hashes; sign-in compares hash.
- **Google** — only registered if both `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set. Uses `allowDangerousEmailAccountLinking` so a user can link Google later by signing in with the same email.

JWT session strategy (no Session table). The JWT callback enriches the token with `isAdmin` and `username` on every request, queried fresh from the DB so admin promotions/demotions take effect immediately.

**First-user-is-admin bootstrap.** The `signIn` callback in `auth.ts` checks if any admin exists; if not, the signing-in user is promoted to admin atomically. This is how a fresh deployment seeds its first admin without an env var.

`src/lib/admin.ts` exports `isAdmin()` and `currentUserId()` thin wrappers around `auth()`. Admin-only Server Actions (e.g. `setUserAdmin`, `unclaimSquare`, `createPool`, `randomizeDigits`) all check `session.user.isAdmin` server-side — never trust client claims.

### The Grid component

`src/components/Grid.tsx` is the one shared 10×10 component used by every page that shows the grid. It takes:
- `squares` — flat array of `{ row, col, participantId, participantName, color }`
- `rowDigits` / `colDigits` — optional 10-char digit strings (header labels)
- `highlight` / `reverseHighlight` — optional `{ rowDigit, colDigit }` to color the winning + reverse cells gold and forest-green respectively
- `onClaim` + `selectedParticipantId` — only set on the claim page; turns empty cells into clickable buttons

The grid is purely presentational; the highlight logic lives at the call site (which already has the games + week to compute it).

### ESPN integration

`src/lib/espn.ts` calls the public `site.api.espn.com` scoreboard endpoint (no auth). The admin page exposes an "Import from ESPN" button per week that upserts every game by `espnId`. Hand-entered games (without an `espnId`) are not touched. ESPN's response shape is undocumented and subject to change; if it breaks, that file is the only thing to fix.

## Conventions worth knowing

- **Money is stored as integer dollars**, not cents. The UI never displays decimals. If you ever need cents-level precision, you'd change every `Int` to model cents and update `dollars()` in `src/lib/format.ts`.
- **Server Actions revalidate aggressively.** Most actions call `revalidatePath` for the affected pool's pages so reads stay consistent. The ESPN import calls `revalidatePath("/", "layout")` because games are global and any pool could be looking at that week.
- **Tailwind theme tokens** live in `tailwind.config.ts` — `forest`, `accent.gold`, `accent.goldSoft`, `surface`, `line`, `ink`. Component classes (`.card`, `.btn-primary`, `.input`, `.badge`, `.label`) live in `src/app/globals.css` so the page files stay readable.
- **Color palette for new participants** — `pickColor()` in `src/lib/format.ts` cycles through 10 pastel hexes. The claim page also exposes a color picker so users can override.
- **`@/*` path alias** maps to `src/*` (configured in `tsconfig.json`).

## Things to be careful about

- Changing the digit string format (currently 10-char ordered string) is a breaking schema change — `parseDigits`, `cellForDigitPair`, the seed data, and the admin display all assume that exact format.
- The "ties go to losers" rule in `weekTotals` is one place — change it once, it propagates everywhere (history, week view, payouts).
- Unclaiming a square (`unclaimSquare` in `actions/squares.ts`) does **not** retroactively unwind payouts already recorded against that participant; it only removes the square. If the admin needs to undo a paid-out winner, they have to delete the corresponding `Payment` row manually (no UI for this yet).
- `computeWinningsByParticipant` does an N+1 query (one `findMany` per `PoolWeek`). Fine at the current scale (≤18 weeks per pool); rewrite as a single grouped query if pools get much larger.
- `setUserAdmin` refuses to demote the last remaining admin — there must always be at least one. If you ever need to wipe everyone, do it via DB, not UI.
- The admin-bootstrap logic in `auth.ts` runs on **every** sign-in but only promotes when `adminCount === 0`. After the first admin exists, it's a no-op. Don't change this without thinking about race conditions on first-deploy.
