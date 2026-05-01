# NFL Squares — Season Pool

A Super-Bowl-style squares pool that runs the full NFL regular season.

- Players claim squares **once for the whole season**.
- Digit headers (top + side) are **re-randomized every week**.
- Each week's winner = (last digit of all winning teams' total scores, last digit of all losing teams' total scores). The reverse pair (losers, winners) is a secondary winner.
- Multiple pools can run side-by-side and share NFL game data, but each pool has its own grid, participants, weekly digits, and payment ledger.

## Quick start

```bash
cp .env.example .env       # set ADMIN_PASSWORD before going live
npm install
npm run db:push            # create the SQLite schema
npm run db:seed            # load sample pools + Week 1 games
npm run dev                # http://localhost:3000
```

## Stack

Next.js 15 App Router · React 19 · TypeScript · Tailwind · Prisma + SQLite.

See [CLAUDE.md](./CLAUDE.md) for architecture details.
