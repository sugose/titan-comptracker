import {
  ApiError,
  NetworkError,
  RateLimitError,
  getMatchDetail,
} from "../../src/services/matchDetailService";

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
    json: async () => body,
  } as unknown as Response;
}

const HOME_TEAM_ID = 10;
const AWAY_TEAM_ID = 20;

const API_MATCH_BASE = {
  id: 999,
  utcDate: "2026-06-11T19:00:00Z",
  status: "IN_PLAY",
  homeTeam: { id: HOME_TEAM_ID, name: "Mexico" },
  awayTeam: { id: AWAY_TEAM_ID, name: "USA" },
  score: { fullTime: { home: 1, away: 0 } },
  goals: [
    { minute: 23, team: { id: HOME_TEAM_ID }, scorer: { name: "Hernandez" } },
    { minute: 67, team: { id: AWAY_TEAM_ID }, scorer: { name: "Pulisic" } },
  ],
  bookings: [
    { minute: 34, team: { id: AWAY_TEAM_ID }, player: { name: "Adams" }, card: "YELLOW_CARD" },
    { minute: 80, team: { id: HOME_TEAM_ID }, player: { name: "Moreno" }, card: "RED_CARD" },
  ],
  substitutions: [
    {
      minute: 60,
      team: { id: HOME_TEAM_ID },
      playerOut: { name: "Lozano" },
      playerIn: { name: "Antuna" },
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getMatchDetail", () => {
  it("returns a MatchDetail with all events sorted by minute ascending", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ match: API_MATCH_BASE }));
    const detail = await getMatchDetail(999);

    expect(detail.id).toBe(999);
    expect(detail.homeTeam).toBe("Mexico");
    expect(detail.awayTeam).toBe("USA");
    expect(detail.events).toHaveLength(5);

    const minutes = detail.events.map((e) => e.minute);
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
  });

  it("maps GOAL events with correct team side", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ match: API_MATCH_BASE }));
    const detail = await getMatchDetail(999);

    const goals = detail.events.filter((e) => e.type === "GOAL");
    expect(goals).toHaveLength(2);

    const homeGoal = goals.find((e) => e.type === "GOAL" && e.minute === 23);
    expect(homeGoal).toBeDefined();
    expect(homeGoal?.team).toBe("HOME");
    if (homeGoal?.type === "GOAL") expect(homeGoal.scorer).toBe("Hernandez");

    const awayGoal = goals.find((e) => e.type === "GOAL" && e.minute === 67);
    expect(awayGoal?.team).toBe("AWAY");
  });

  it("maps BOOKING events with card type and team side", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ match: API_MATCH_BASE }));
    const detail = await getMatchDetail(999);

    const bookings = detail.events.filter((e) => e.type === "BOOKING");
    expect(bookings).toHaveLength(2);

    const yellow = bookings.find((e) => e.type === "BOOKING" && e.minute === 34);
    expect(yellow?.team).toBe("AWAY");
    if (yellow?.type === "BOOKING") {
      expect(yellow.card).toBe("YELLOW_CARD");
      expect(yellow.player).toBe("Adams");
    }

    const red = bookings.find((e) => e.type === "BOOKING" && e.minute === 80);
    expect(red?.team).toBe("HOME");
    if (red?.type === "BOOKING") expect(red.card).toBe("RED_CARD");
  });

  it("maps SUBSTITUTION events with playerOut and playerIn", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ match: API_MATCH_BASE }));
    const detail = await getMatchDetail(999);

    const subs = detail.events.filter((e) => e.type === "SUBSTITUTION");
    expect(subs).toHaveLength(1);
    expect(subs[0].team).toBe("HOME");
    if (subs[0].type === "SUBSTITUTION") {
      expect(subs[0].playerOut).toBe("Lozano");
      expect(subs[0].playerIn).toBe("Antuna");
    }
  });

  it("treats null goals array as empty", async () => {
    const apiMatch = { ...API_MATCH_BASE, goals: null };
    mockFetch.mockResolvedValueOnce(makeResponse({ match: apiMatch }));
    const detail = await getMatchDetail(999);
    const goals = detail.events.filter((e) => e.type === "GOAL");
    expect(goals).toHaveLength(0);
  });

  it("treats null bookings array as empty", async () => {
    const apiMatch = { ...API_MATCH_BASE, bookings: null };
    mockFetch.mockResolvedValueOnce(makeResponse({ match: apiMatch }));
    const detail = await getMatchDetail(999);
    const bookings = detail.events.filter((e) => e.type === "BOOKING");
    expect(bookings).toHaveLength(0);
  });

  it("treats null substitutions array as empty", async () => {
    const apiMatch = { ...API_MATCH_BASE, substitutions: null };
    mockFetch.mockResolvedValueOnce(makeResponse({ match: apiMatch }));
    const detail = await getMatchDetail(999);
    const subs = detail.events.filter((e) => e.type === "SUBSTITUTION");
    expect(subs).toHaveLength(0);
  });

  it("throws RateLimitError when X-Requests-Available is 0", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({}, 200, {
        "X-Requests-Available": "0",
        "X-RequestCounter-Reset": "1700000000",
      }),
    );
    await expect(getMatchDetail(999)).rejects.toBeInstanceOf(RateLimitError);
  });

  it("includes resetTimestamp in RateLimitError", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({}, 200, {
        "X-Requests-Available": "0",
        "X-RequestCounter-Reset": "1700000000",
      }),
    );
    await expect(getMatchDetail(999)).rejects.toMatchObject({ resetTimestamp: "1700000000" });
  });

  it("throws NetworkError when fetch rejects", async () => {
    mockFetch.mockRejectedValueOnce(new Error("offline"));
    await expect(getMatchDetail(999)).rejects.toBeInstanceOf(NetworkError);
  });

  it("throws ApiError on non-2xx response", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({}, 404));
    await expect(getMatchDetail(999)).rejects.toBeInstanceOf(ApiError);
  });

  it("includes status code in ApiError", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({}, 500));
    await expect(getMatchDetail(999)).rejects.toMatchObject({ statusCode: 500 });
  });

  it("throws RateLimitError (not ApiError) when status is 429 even if X-Requests-Available is null", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({}, 429));
    await expect(getMatchDetail(999)).rejects.toBeInstanceOf(RateLimitError);
  });

  it("RateLimitError from 429 includes resetTimestamp when header is present", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({}, 429, { "X-RequestCounter-Reset": "1750000000" }),
    );
    await expect(getMatchDetail(999)).rejects.toMatchObject({ resetTimestamp: "1750000000" });
  });
});
