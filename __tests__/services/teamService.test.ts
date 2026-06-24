import {
  ApiError,
  NetworkError,
  RateLimitError,
  getTeamCrests,
} from "../../src/services/teamService";

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

const API_RESPONSE = {
  teams: [
    { name: "Mexico", crest: "https://crests.example.com/mexico.png" },
    { name: "USA", crest: "https://crests.example.com/usa.png" },
    { name: "Canada", crest: null },
    { name: "Brazil", crest: undefined },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getTeamCrests", () => {
  it("returns a name→crest map for teams with a crest", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(API_RESPONSE));
    const result = await getTeamCrests("WC");
    expect(result.Mexico).toBe("https://crests.example.com/mexico.png");
    expect(result.USA).toBe("https://crests.example.com/usa.png");
  });

  it("omits teams with null crest", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(API_RESPONSE));
    const result = await getTeamCrests("WC");
    expect("Canada" in result).toBe(false);
  });

  it("omits teams with undefined crest", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(API_RESPONSE));
    const result = await getTeamCrests("WC");
    expect("Brazil" in result).toBe(false);
  });

  it("calls the correct endpoint with the competition code", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ teams: [] }));
    await getTeamCrests("PL");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v4/competitions/PL/teams"),
      expect.any(Object),
    );
  });

  it("omits teams with SVG crest URLs", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({
        teams: [
          { name: "Mexico", crest: "https://crests.example.com/mexico.svg" },
          { name: "USA", crest: "https://crests.example.com/usa.png" },
        ],
      }),
    );
    const result = await getTeamCrests("WC");
    expect("Mexico" in result).toBe(false);
    expect(result.USA).toBe("https://crests.example.com/usa.png");
  });

  it("returns an empty record when teams array is empty", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ teams: [] }));
    const result = await getTeamCrests("WC");
    expect(result).toEqual({});
  });

  it("throws RateLimitError when X-Requests-Available is 0", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({}, 200, {
        "X-Requests-Available": "0",
        "X-RequestCounter-Reset": "1700000000",
      }),
    );
    await expect(getTeamCrests("WC")).rejects.toBeInstanceOf(RateLimitError);
  });

  it("includes resetTimestamp in RateLimitError", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({}, 200, {
        "X-Requests-Available": "0",
        "X-RequestCounter-Reset": "1700000000",
      }),
    );
    await expect(getTeamCrests("WC")).rejects.toMatchObject({ resetTimestamp: "1700000000" });
  });

  it("throws NetworkError when fetch rejects", async () => {
    mockFetch.mockRejectedValueOnce(new Error("offline"));
    await expect(getTeamCrests("WC")).rejects.toBeInstanceOf(NetworkError);
  });

  it("throws ApiError on non-2xx response", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({}, 403));
    await expect(getTeamCrests("WC")).rejects.toBeInstanceOf(ApiError);
  });

  it("includes status code in ApiError", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({}, 500));
    await expect(getTeamCrests("WC")).rejects.toMatchObject({ statusCode: 500 });
  });
});
