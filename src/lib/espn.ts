// Lightweight client for ESPN's public NFL scoreboard endpoint.
// No auth required. Endpoint shape (subject to change without notice):
//   https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=1&seasontype=2&dates=2025

const BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

export type EspnGame = {
  espnId: string;
  awayTeam: string;
  homeTeam: string;
  awayScore: number | null;
  homeScore: number | null;
  isFinal: boolean;
  kickoffAt: Date | null;
};

type EspnEvent = {
  id: string;
  date?: string;
  status?: { type?: { completed?: boolean; state?: string } };
  competitions?: Array<{
    competitors?: Array<{
      homeAway: "home" | "away";
      score?: string;
      team?: { displayName?: string; shortDisplayName?: string; name?: string };
    }>;
  }>;
};

export async function fetchEspnWeek(year: number, week: number, seasonType = 2): Promise<EspnGame[]> {
  const url = `${BASE}?week=${week}&seasontype=${seasonType}&dates=${year}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`ESPN fetch failed: ${res.status}`);
  const json = (await res.json()) as { events?: EspnEvent[] };
  return parseEvents(json.events ?? []);
}

// Fetches whatever ESPN considers the "current" scoreboard (no week filter).
// Returns at most `limit` games, sorted by kickoff time. Returns [] silently
// on any error so the home-page widget never blocks the page.
export async function fetchEspnCurrentScoreboard(limit = 6): Promise<EspnGame[]> {
  try {
    const res = await fetch(BASE, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = (await res.json()) as { events?: EspnEvent[] };
    const games = parseEvents(json.events ?? []);
    games.sort((a, b) => {
      const at = a.kickoffAt?.getTime() ?? 0;
      const bt = b.kickoffAt?.getTime() ?? 0;
      return at - bt;
    });
    return games.slice(0, limit);
  } catch {
    return [];
  }
}

function parseEvents(events: EspnEvent[]): EspnGame[] {
  return events.map((ev) => {
    const comp = ev.competitions?.[0];
    const competitors = comp?.competitors ?? [];
    const away = competitors.find((c) => c.homeAway === "away");
    const home = competitors.find((c) => c.homeAway === "home");
    const isFinal = !!ev.status?.type?.completed;
    return {
      espnId: ev.id,
      awayTeam: away?.team?.shortDisplayName ?? away?.team?.name ?? "Away",
      homeTeam: home?.team?.shortDisplayName ?? home?.team?.name ?? "Home",
      awayScore: away?.score != null ? Number(away.score) : null,
      homeScore: home?.score != null ? Number(home.score) : null,
      isFinal,
      kickoffAt: ev.date ? new Date(ev.date) : null,
    };
  });
}
