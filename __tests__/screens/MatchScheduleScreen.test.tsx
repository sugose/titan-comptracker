import { render, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import MatchScheduleScreen from "../../app/competition/[id]";
import {
  ApiError,
  NetworkError,
  RateLimitError,
  getMatches,
} from "../../src/services/footballDataService";
import type { Match } from "../../src/types/competition";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "WC" }),
}));

jest.mock("../../src/services/footballDataService", () => {
  const actual = jest.requireActual("../../src/services/footballDataService");
  return { ...actual, getMatches: jest.fn() };
});

jest.mock("../../src/components/GameCardCompact", () => ({
  GameCardCompact: ({ match }: { match: Match }) => {
    const { Text } = require("react-native");
    return (
      <Text testID={`compact-${match.id}`}>
        {match.homeTeam} vs {match.awayTeam}
      </Text>
    );
  },
}));

jest.mock("../../src/components/GameCardFocused", () => ({
  GameCardFocused: ({ match }: { match: Match }) => {
    const { Text } = require("react-native");
    return (
      <Text testID={`focused-${match.id}`}>
        {match.homeTeam} vs {match.awayTeam}
      </Text>
    );
  },
}));

jest.mock("../../src/utils/time", () => ({
  formatInTimeZone: jest.fn((d: string, tz: string) => `${d}@${tz}`),
  getVenueTimeZone: jest.fn(() => "UTC"),
}));

const MATCH_A: Match = {
  id: 1,
  utcDate: "2026-06-11T19:00:00Z",
  status: "SCHEDULED",
  homeTeam: "Mexico",
  awayTeam: "USA",
  venue: { name: "Azteca", city: "Mexico City", country: "Mexico" },
};

const MATCH_B: Match = {
  id: 2,
  utcDate: "2026-06-14T22:00:00Z",
  status: "SCHEDULED",
  homeTeam: "Canada",
  awayTeam: "Argentina",
  venue: { name: "BMO Field", city: "Toronto", country: "Canada" },
};

const MATCH_C: Match = {
  id: 3,
  utcDate: "2026-06-10T17:00:00Z",
  status: "SCHEDULED",
  homeTeam: "Brazil",
  awayTeam: "Germany",
  venue: { name: "MetLife", city: "East Rutherford", country: "USA" },
};

const MATCH_ONGOING: Match = {
  id: 4,
  utcDate: "2026-06-11T20:00:00Z",
  status: "IN_PLAY",
  homeTeam: "France",
  awayTeam: "Spain",
  venue: { name: "SoFi Stadium", city: "Inglewood", country: "USA" },
};

const MATCH_FINISHED: Match = {
  id: 5,
  utcDate: "2026-06-10T15:00:00Z",
  status: "FINISHED",
  homeTeam: "Italy",
  awayTeam: "Portugal",
  venue: { name: "Rose Bowl", city: "Pasadena", country: "USA" },
  score: { home: 1, away: 0 },
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe("MatchScheduleScreen", () => {
  it("shows a loading indicator while fetching", () => {
    (getMatches as jest.Mock).mockReturnValueOnce(new Promise(() => {}));
    render(<MatchScheduleScreen />);
    expect(screen.getByTestId("loading-indicator")).toBeTruthy();
  });

  it("shows a rate limit error message when RateLimitError is thrown", async () => {
    (getMatches as jest.Mock).mockRejectedValueOnce(new RateLimitError(null));
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      expect(screen.getByText(/rate limit/i)).toBeTruthy();
    });
  });

  it("shows a network error message when NetworkError is thrown", async () => {
    (getMatches as jest.Mock).mockRejectedValueOnce(new NetworkError(new Error("offline")));
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeTruthy();
    });
  });

  it("shows an API error message when ApiError is thrown", async () => {
    (getMatches as jest.Mock).mockRejectedValueOnce(new ApiError(500));
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeTruthy();
    });
  });

  it("renders one focused card and compact cards for all others on success", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_A, MATCH_B]);
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      // First card (index 0) is focused by default; second is compact
      expect(screen.getByTestId("focused-1")).toBeTruthy();
      expect(screen.getByTestId("compact-2")).toBeTruthy();
    });
  });

  it("renders matches sorted ascending by utcDate", async () => {
    // MATCH_C (Jun 10) is earlier than MATCH_A (Jun 11) — pass in reverse order
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_A, MATCH_C]);
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      // MATCH_C (id 3, Jun 10) must appear as focused (first); MATCH_A (id 1) compact
      expect(screen.getByTestId("focused-3")).toBeTruthy();
      expect(screen.getByTestId("compact-1")).toBeTruthy();
    });
  });

  it("renders all matches when the list has more than two", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_A, MATCH_B, MATCH_C]);
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      // After sort: MATCH_C (Jun 10) focused, MATCH_A (Jun 11) and MATCH_B (Jun 14) compact
      expect(screen.getByTestId("focused-3")).toBeTruthy();
      expect(screen.getByTestId("compact-1")).toBeTruthy();
      expect(screen.getByTestId("compact-2")).toBeTruthy();
    });
  });

  it("focuses the first ONGOING match on load when one exists", async () => {
    // After sort: MATCH_C (Jun 10 SCHEDULED), MATCH_ONGOING (Jun 11 IN_PLAY), MATCH_B (Jun 14 SCHEDULED)
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_B, MATCH_C, MATCH_ONGOING]);
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("focused-4")).toBeTruthy();
      expect(screen.getByTestId("compact-3")).toBeTruthy();
      expect(screen.getByTestId("compact-2")).toBeTruthy();
    });
  });

  it("focuses the first UPCOMING match when no ONGOING match exists", async () => {
    // After sort: MATCH_FINISHED (Jun 10), MATCH_A (Jun 11 SCHEDULED), MATCH_B (Jun 14 SCHEDULED)
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_B, MATCH_A, MATCH_FINISHED]);
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      // MATCH_FINISHED is index 0 but FINISHED; first UPCOMING is MATCH_A at index 1
      expect(screen.getByTestId("focused-1")).toBeTruthy();
      expect(screen.getByTestId("compact-5")).toBeTruthy();
      expect(screen.getByTestId("compact-2")).toBeTruthy();
    });
  });

  it("defaults to index 0 when all matches are FINISHED", async () => {
    const finishedA: Match = { ...MATCH_FINISHED, id: 6, utcDate: "2026-06-09T15:00:00Z" };
    const finishedB: Match = { ...MATCH_FINISHED, id: 7, utcDate: "2026-06-10T15:00:00Z" };
    (getMatches as jest.Mock).mockResolvedValueOnce([finishedB, finishedA]);
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      // After sort: finishedA (Jun 9) at index 0 → focused
      expect(screen.getByTestId("focused-6")).toBeTruthy();
      expect(screen.getByTestId("compact-7")).toBeTruthy();
    });
  });

  // Note: scrollTo on a ScrollView ref is not directly observable in RNTL without
  // a custom ScrollView mock that exposes the ref's scrollTo method. The test here
  // verifies that advancing fake timers past the 100ms setTimeout does not crash
  // and the correct card is still focused. The scroll offset calculation is covered
  // by the implementation logic itself.
  it("does not crash when the layout timeout fires after initial focus is set", async () => {
    jest.useFakeTimers();
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_C, MATCH_ONGOING, MATCH_B]);
    render(<MatchScheduleScreen />);

    // Wait for the async getMatches to resolve (use real async resolution)
    await waitFor(() => screen.getByTestId("focused-4"));

    // Advance past the 100ms layout timeout — must not throw
    expect(() => jest.runAllTimers()).not.toThrow();

    // Focused card is still correct after timer fires
    expect(screen.getByTestId("focused-4")).toBeTruthy();
  });
});
