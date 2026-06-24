import { ApiError, NetworkError, RateLimitError } from "./footballDataService";

export { ApiError, NetworkError, RateLimitError };

const BASE_URL = "https://api.football-data.org";

interface ApiTeam {
  name: string;
  crest?: string | null;
}

interface ApiResponse {
  teams: ApiTeam[];
}

export async function getTeamCrests(competitionCode: string): Promise<Record<string, string>> {
  const url = `${BASE_URL}/v4/competitions/${competitionCode}/teams`;
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
  const result: Record<string, string> = {};

  for (const team of data.teams) {
    if (team.crest && !team.crest.toLowerCase().endsWith(".svg")) {
      result[team.name] = team.crest;
    }
  }

  return result;
}
