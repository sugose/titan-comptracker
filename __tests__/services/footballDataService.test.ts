import {
  ApiError,
  NetworkError,
  RateLimitError,
  getMatches,
} from "../../src/services/footballDataService";

const MOCK_API_MATCH = {
  id: 1,
  utcDate: "2026-06-11T19:00:00Z",
  status: "SCHEDULED",
  venue: "Estadio Azteca",
  homeTeam: { id: 10, name: "Mexico" },
  awayTeam: { id: 20, name: "USA" },
};

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
    body = { matches: [MOCK_API_MATCH] },
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

describe("getMatches", () => {
  it("returns a typed Match[] on a successful response", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeMockResponse());

    const matches = await getMatches("WC");

    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe(1);
    expect(matches[0].homeTeam).toBe("Mexico");
    expect(matches[0].awayTeam).toBe("USA");
    expect(matches[0].utcDate).toBe("2026-06-11T19:00:00Z");
    expect(matches[0].status).toBe("SCHEDULED");
    expect(matches[0].venue.name).toBe("Estadio Azteca");
  });

  it("sets the X-Auth-Token header on every request", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeMockResponse());

    await getMatches("WC");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("WC"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Auth-Token": "test-api-key",
        }),
      }),
    );
  });

  it("fetches from the correct endpoint URL", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeMockResponse());

    await getMatches("WC");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v4/competitions/WC/matches"),
      expect.anything(),
    );
  });

  it("throws RateLimitError when X-Requests-Available is 0", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeMockResponse({ availableRequests: "0" }));

    await expect(getMatches("WC")).rejects.toThrow(RateLimitError);
  });

  it("throws RateLimitError (not ApiError) when X-Requests-Available is 0 on a 429 response", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(makeMockResponse({ ok: false, status: 429, availableRequests: "0" }));

    await expect(getMatches("WC")).rejects.toThrow(RateLimitError);
  });

  it("throws RateLimitError (not ApiError) when status is 429 and X-Requests-Available is 0", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      makeMockResponse({ ok: false, status: 429, availableRequests: "0", resetTimestamp: "1750000000" }),
    );
    await expect(getMatches("WC")).rejects.toThrow(RateLimitError);
  });

  it("RateLimitError includes the reset timestamp when provided", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        makeMockResponse({ availableRequests: "0", resetTimestamp: "1750000000" }),
      );

    await expect(getMatches("WC")).rejects.toMatchObject({
      resetTimestamp: "1750000000",
    });
  });

  it("throws NetworkError when fetch rejects (network failure)", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new TypeError("Network request failed"));

    await expect(getMatches("WC")).rejects.toThrow(NetworkError);
  });

  it("throws ApiError on a non-2xx response", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(makeMockResponse({ ok: false, status: 403, availableRequests: null }));

    await expect(getMatches("WC")).rejects.toThrow(ApiError);
  });

  it("ApiError includes the HTTP status code", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(makeMockResponse({ ok: false, status: 429, availableRequests: null }));

    await expect(getMatches("WC")).rejects.toMatchObject({ statusCode: 429 });
  });

  it("returns an empty array when the API returns no matches", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeMockResponse({ body: { matches: [] } }));

    const matches = await getMatches("WC");
    expect(matches).toEqual([]);
  });

  it("handles multiple matches in the response", async () => {
    const secondMatch = {
      ...MOCK_API_MATCH,
      id: 2,
      homeTeam: { id: 3, name: "Brazil" },
      awayTeam: { id: 4, name: "Argentina" },
    };
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        makeMockResponse({ body: { matches: [MOCK_API_MATCH, secondMatch] } }),
      );

    const matches = await getMatches("WC");
    expect(matches).toHaveLength(2);
    expect(matches[1].homeTeam).toBe("Brazil");
  });
});
