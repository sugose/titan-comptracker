import {
  ApiError,
  NetworkError,
  RateLimitError,
  getCompetitions,
} from "../../src/services/competitionService";

const FREE_TIER_CODES = [
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
];

function makeApiCompetition(
  overrides: Partial<{
    id: number;
    code: string;
    name: string;
    area: { name: string };
    currentSeason: { startDate: string; endDate: string; currentMatchday: number | null } | null;
  }> = {},
) {
  return {
    id: 1,
    code: "WC",
    name: "FIFA World Cup",
    area: { name: "World" },
    currentSeason: { startDate: "2026-06-11", endDate: "2026-07-19", currentMatchday: null },
    ...overrides,
  };
}

function makeMockResponse(
  overrides: Partial<{
    ok: boolean;
    status: number;
    availableRequests: string | null;
    resetTimestamp: string | null;
    body: unknown;
  }> = {},
): Response {
  const {
    ok = true,
    status = 200,
    availableRequests = "9",
    resetTimestamp = null,
    body = { competitions: [makeApiCompetition()] },
  } = overrides;

  return {
    ok,
    status,
    headers: {
      get: (header: string) => {
        if (header === "X-Requests-Available") return availableRequests;
        if (header === "X-RequestCounter-Reset") return resetTimestamp;
        return null;
      },
    },
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_API_KEY = "test-api-key";
});

describe("getCompetitions", () => {
  it("returns a typed Competition[] on a successful response", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeMockResponse());

    const competitions = await getCompetitions();

    expect(competitions).toHaveLength(1);
    expect(competitions[0].id).toBe(1);
    expect(competitions[0].code).toBe("WC");
    expect(competitions[0].name).toBe("FIFA World Cup");
    expect(competitions[0].area).toBe("World");
    expect(competitions[0].currentSeason).toEqual({
      startDate: "2026-06-11",
      endDate: "2026-07-19",
      currentMatchday: null,
    });
  });

  it("sets the X-Auth-Token header on every request", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeMockResponse());

    await getCompetitions();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v4/competitions"),
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Auth-Token": "test-api-key" }),
      }),
    );
  });

  it("fetches from the correct endpoint URL", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeMockResponse());

    await getCompetitions();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v4/competitions"),
      expect.anything(),
    );
  });

  it("filters out competitions not in the free tier list", async () => {
    const body = {
      competitions: [
        makeApiCompetition({ id: 1, code: "WC", name: "FIFA World Cup", area: { name: "World" } }),
        makeApiCompetition({
          id: 99,
          code: "UNLISTED",
          name: "Unknown League",
          area: { name: "Nowhere" },
        }),
      ],
    };
    global.fetch = jest.fn().mockResolvedValueOnce(makeMockResponse({ body }));

    const competitions = await getCompetitions();

    expect(competitions).toHaveLength(1);
    expect(competitions[0].code).toBe("WC");
  });

  it("returns all 12 free tier competitions when all are present", async () => {
    const body = {
      competitions: FREE_TIER_CODES.map((code, i) =>
        makeApiCompetition({
          id: i + 1,
          code,
          name: `League ${code}`,
          area: { name: `Area ${i}` },
        }),
      ),
    };
    global.fetch = jest.fn().mockResolvedValueOnce(makeMockResponse({ body }));

    const competitions = await getCompetitions();

    expect(competitions).toHaveLength(12);
  });

  it("sorts competitions by area name then competition name", async () => {
    const body = {
      competitions: [
        makeApiCompetition({
          id: 1,
          code: "PL",
          name: "Premier League",
          area: { name: "England" },
        }),
        makeApiCompetition({ id: 2, code: "BL1", name: "Bundesliga", area: { name: "Germany" } }),
        makeApiCompetition({ id: 3, code: "ELC", name: "Championship", area: { name: "England" } }),
      ],
    };
    global.fetch = jest.fn().mockResolvedValueOnce(makeMockResponse({ body }));

    const competitions = await getCompetitions();

    expect(competitions[0].code).toBe("ELC"); // England — Championship
    expect(competitions[1].code).toBe("PL"); // England — Premier League
    expect(competitions[2].code).toBe("BL1"); // Germany — Bundesliga
  });

  it("maps null currentSeason to null", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        makeMockResponse({ body: { competitions: [makeApiCompetition({ currentSeason: null })] } }),
      );

    const competitions = await getCompetitions();

    expect(competitions[0].currentSeason).toBeNull();
  });

  it("throws RateLimitError when X-Requests-Available is 0", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeMockResponse({ availableRequests: "0" }));

    await expect(getCompetitions()).rejects.toThrow(RateLimitError);
  });

  it("throws RateLimitError (not ApiError) on 429 with X-Requests-Available 0", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(makeMockResponse({ ok: false, status: 429, availableRequests: "0" }));

    await expect(getCompetitions()).rejects.toThrow(RateLimitError);
  });

  it("throws NetworkError when fetch rejects", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new TypeError("Network request failed"));

    await expect(getCompetitions()).rejects.toThrow(NetworkError);
  });

  it("throws ApiError on a non-2xx response", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(makeMockResponse({ ok: false, status: 403, availableRequests: null }));

    await expect(getCompetitions()).rejects.toThrow(ApiError);
  });

  it("ApiError includes the HTTP status code", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(makeMockResponse({ ok: false, status: 500, availableRequests: null }));

    await expect(getCompetitions()).rejects.toMatchObject({ statusCode: 500 });
  });

  it("returns an empty array when no free tier competitions are in the response", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(makeMockResponse({ body: { competitions: [] } }));

    const competitions = await getCompetitions();
    expect(competitions).toEqual([]);
  });

  it("throws RateLimitError (not ApiError) when status is 429 even if X-Requests-Available is null", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(makeMockResponse({ ok: false, status: 429, availableRequests: null }));

    await expect(getCompetitions()).rejects.toBeInstanceOf(RateLimitError);
  });

  it("RateLimitError from 429 includes resetTimestamp when header is present", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      makeMockResponse({
        ok: false,
        status: 429,
        availableRequests: null,
        resetTimestamp: "1750000000",
      }),
    );

    await expect(getCompetitions()).rejects.toMatchObject({ resetTimestamp: "1750000000" });
  });
});
