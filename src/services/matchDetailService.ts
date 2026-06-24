import type { MatchDetail, MatchEvent } from "../types/competition";
import { ApiError, NetworkError, RateLimitError } from "./footballDataService";

export { ApiError, NetworkError, RateLimitError };

const BASE_URL = "https://api.football-data.org";

interface ApiTeamRef {
  id: number;
}

interface ApiGoal {
  minute: number;
  team: ApiTeamRef;
  scorer: { name: string };
}

interface ApiBooking {
  minute: number;
  team: ApiTeamRef;
  player: { name: string };
  card: "YELLOW_CARD" | "RED_CARD";
}

interface ApiSubstitution {
  minute: number;
  team: ApiTeamRef;
  playerOut: { name: string };
  playerIn: { name: string };
}

interface ApiMatchDetail {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  score?: {
    fullTime: { home: number | null; away: number | null };
  };
  goals: ApiGoal[] | null;
  bookings: ApiBooking[] | null;
  substitutions: ApiSubstitution[] | null;
}

interface ApiDetailResponse {
  match: ApiMatchDetail;
}

function teamSide(teamId: number, homeTeamId: number): "HOME" | "AWAY" {
  return teamId === homeTeamId ? "HOME" : "AWAY";
}

function mapEvents(api: ApiMatchDetail): MatchEvent[] {
  const homeId = api.homeTeam.id;
  const events: MatchEvent[] = [];

  for (const g of api.goals ?? []) {
    events.push({
      type: "GOAL",
      minute: g.minute,
      team: teamSide(g.team.id, homeId),
      scorer: g.scorer.name,
    });
  }

  for (const b of api.bookings ?? []) {
    events.push({
      type: "BOOKING",
      minute: b.minute,
      team: teamSide(b.team.id, homeId),
      player: b.player.name,
      card: b.card,
    });
  }

  for (const s of api.substitutions ?? []) {
    events.push({
      type: "SUBSTITUTION",
      minute: s.minute,
      team: teamSide(s.team.id, homeId),
      playerOut: s.playerOut.name,
      playerIn: s.playerIn.name,
    });
  }

  return events.sort((a, b) => a.minute - b.minute);
}

export async function getMatchDetail(matchId: number): Promise<MatchDetail> {
  const url = `${BASE_URL}/v4/matches/${matchId}`;
  const apiKey = process.env.EXPO_PUBLIC_API_KEY ?? "";

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "X-Auth-Token": apiKey },
    });
  } catch (err) {
    throw new NetworkError(err);
  }

  const available = response.headers.get("X-Requests-Available");
  const reset = response.headers.get("X-RequestCounter-Reset");

  if (available === "0") {
    throw new RateLimitError(reset);
  }

  if (response.status === 429) {
    throw new RateLimitError(reset);
  }

  if (!response.ok) {
    throw new ApiError(response.status);
  }

  const data = (await response.json()) as ApiDetailResponse;
  const api = data.match;

  return {
    id: api.id,
    utcDate: api.utcDate,
    status: api.status as MatchDetail["status"],
    homeTeam: api.homeTeam.name,
    awayTeam: api.awayTeam.name,
    venue: { name: "", city: "", country: "" },
    ...(api.score !== undefined && {
      score: {
        home: api.score.fullTime.home,
        away: api.score.fullTime.away,
      },
    }),
    events: mapEvents(api),
  };
}
