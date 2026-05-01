# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A season-long NFL Squares pool. Unlike a typical Super Bowl squares grid, players claim squares **once for the whole season**; the digit headers along the top and side of the grid are **re-randomized every week**. Each week, the winning square is determined by combining the scores of all winning teams that week, combining all losing teams' scores separately, and using the last digit of each as the (winners-digit, losers-digit) pair. The reverse pair (losers-digit, winners-digit) is a secondary winner.

The app supports multiple independent pools that share NFL game data but have their own participants, squares, weekly digits, and payment ledgers.

## Common commands

```bash
npm run dev         # Next.js dev server on :3000
npm run build       # production build (also runs type-checking)
npm run lint        # next lint
npm run db:push     # apply prisma/schema.prisma to the SQLite DB
npm run db:seed     # load sample pools (Smith Family, Main Pool) + Week 1 games
npm run db:reset    # nuke and re-seed (handy after schema changes)
```

The DB lives at `prisma/dev.db` (SQLite, gitignored). `npm install` triggers `prisma generate` automatically via the `postinstall` hook, so the schema must exist before installs work.

Required env vars (see `.env.example`):
- `DATABASE_URL` — defaults to `file:./dev.db`
- `ADMIN_PASSWORD` — single shared password for the admin pages; must be set or admin login is permanently rejected

## Architecture

### Data model (`prisma/schema.prisma`)

Three globally-scoped concepts and four pool-scoped concepts. Understanding the boundary is essential:

- **Global (shared across all pools):** `Game` — one row per NFL game, identified by `weekNumber + teams` (or `espnId` if imported). Game scores entered on any pool's admin page affect every pool.
- **Pool-scoped:** `Pool`, `Participant`, `Square`, `PoolWeek`, `Payment`, `ActivityLog`. Each `Pool` randomizes its own weekly digits independently.

Key invariants:
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

- `/` — pool switcher / home (lists every pool, "Create Pool" form)
- `/p/[slug]` — pool home (stats cards, full grid with active-week digits, recent activity)
- `/p/[slug]/claim` — claim page (pick or create participant, click empty cells)
- `/p/[slug]/week/[n]` — single-week view (games list, mini grid, running totals)
- `/p/[slug]/history` — past completed weeks, with `?wk=N` query for selection
- `/p/[slug]/admin` — gated by `ADMIN_PASSWORD` cookie; payments table + per-week game/digits manager

`src/app/p/[slug]/layout.tsx` validates the slug exists and 404s otherwise. Every page-level component fetches its own data via `prisma` directly — there is no separate API layer. Mutations go through **Server Actions** in `src/app/actions/*.ts`:

- `pools.ts` — create new pool (auto-slugifies, ensures uniqueness)
- `squares.ts` — create participant, claim/unclaim square
- `weeks.ts` — randomize digits, set active week, save game score, add/delete game, ESPN import
- `payments.ts` — record payment
- `auth.ts` — admin login/logout (sets HTTP-only cookie matching `ADMIN_PASSWORD`)

### Auth model

There is **no per-user auth** by design. Anyone with a pool URL can claim squares under any name they choose. The only gate is the admin page, which checks an `nfl_squares_admin` HTTP-only cookie against `ADMIN_PASSWORD` via `src/lib/admin.ts`. The cookie is set for 30 days. `isAdmin()` is awaited on the server in `app/p/[slug]/admin/page.tsx`; non-admins see `<AdminLogin>` instead of the real page.

If `ADMIN_PASSWORD` is unset, login always returns false — the admin page becomes inaccessible (intentional; fail-closed).

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
