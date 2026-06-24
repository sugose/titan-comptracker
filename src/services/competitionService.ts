import type { Competition, Season } from "../types/competition";
import { ApiError, NetworkError, RateLimitError } from "./footballDataService";

export { ApiError, NetworkError, RateLimitError };

const BASE_URL = "https://api.football-data.org";

const FREE_TIER_CODES = new Set([
  "WC",
  "CL",
  "EC",
  "PL",
  "ELC",
  "FL1",
  "BL1",
  "SA",
  "DED",
  "PPL",
  "PD",
  "BSA",
]);

interface ApiSeason {
  startDate: string;
  endDate: string;
  currentMatchday: number | null;
}

interface ApiCompetition {
  id: number;
  code: string;
  name: string;
  area: { name: string };
  currentSeason: ApiSeason | null;
}

interface ApiResponse {
  competitions: ApiCompetition[];
}

function mapSeason(apiSeason: ApiSeason | null): Season | null {
  if (apiSeason === null) return null;
  return {
    startDate: apiSeason.startDate,
    endDate: apiSeason.endDate,
    currentMatchday: apiSeason.currentMatchday,
  };
}

function mapCompetition(api: ApiCompetition): Competition {
  return {
    id: api.id,
    code: api.code,
    name: api.name,
    area: api.area.name,
    currentSeason: mapSeason(api.currentSeason),
  };
}

export async function getCompetitions(): Promise<Competition[]> {
  const url = `${BASE_URL}/v4/competitions`;
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

  const data = (await response.json()) as ApiResponse;

  return data.competitions
    .filter((c) => FREE_TIER_CODES.has(c.code))
    .map(mapCompetition)
    .sort((a, b) => {
      const areaOrder = a.area.localeCompare(b.area);
      return areaOrder !== 0 ? areaOrder : a.name.localeCompare(b.name);
    });
}
