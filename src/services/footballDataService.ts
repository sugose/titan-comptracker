import type { Match } from "../types/competition";

const BASE_URL = "https://api.football-data.org";

export class RateLimitError extends Error {
  readonly resetTimestamp: string | null;

  constructor(resetTimestamp: string | null) {
    super("Rate limit exhausted");
    this.name = "RateLimitError";
    this.resetTimestamp = resetTimestamp;
  }
}

export class NetworkError extends Error {
  constructor(cause: unknown) {
    super("Network request failed");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

export class ApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number) {
    super(`API error: ${statusCode}`);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

interface ApiTeam {
  id: number;
  name: string;
}

interface ApiMatch {
  id: number;
  utcDate: string;
  status: string;
  venue?: string;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
}

interface ApiResponse {
  matches: ApiMatch[];
}

function mapMatch(apiMatch: ApiMatch): Match {
  return {
    id: apiMatch.id,
    utcDate: apiMatch.utcDate,
    // API may return undocumented status values; GameCard handles unknown values gracefully.
    status: apiMatch.status as Match["status"],
    homeTeam: apiMatch.homeTeam.name,
    awayTeam: apiMatch.awayTeam.name,
    // Note: football-data.org free tier does not return structured venue city/country at match level.
    // venue.name is populated from the API's venue string; city and country default to "".
    // getVenueTimeZone("", "") returns "UTC" as fallback — this is expected behaviour.
    venue: {
      name: apiMatch.venue ?? "",
      city: "",
      country: "",
    },
  };
}

export async function getMatches(competitionId: string): Promise<Match[]> {
  const url = `${BASE_URL}/v4/competitions/${competitionId}/matches`;
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

  if (!response.ok) {
    throw new ApiError(response.status);
  }

  const data = (await response.json()) as ApiResponse;
  return data.matches.map(mapMatch);
}
