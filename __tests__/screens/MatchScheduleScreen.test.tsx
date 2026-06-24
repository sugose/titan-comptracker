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

// Keep real error classes; only mock getMatches
jest.mock("../../src/services/footballDataService", () => {
  const actual = jest.requireActual("../../src/services/footballDataService");
  return { ...actual, getMatches: jest.fn() };
});

jest.mock("../../src/components/GameCard", () => ({
  GameCard: ({ match }: { match: Match }) => {
    const { Text } = require("react-native");
    return (
      <Text testID={`gamecard-${match.id}`}>
        {match.homeTeam} vs {match.awayTeam}
      </Text>
    );
  },
}));

// Suppress act() warnings from async state updates
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

beforeEach(() => {
  jest.clearAllMocks();
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

  it("renders a GameCard for each match on success", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_A, MATCH_B]);
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("gamecard-1")).toBeTruthy();
      expect(screen.getByTestId("gamecard-2")).toBeTruthy();
    });
  });

  it("renders matches sorted ascending by utcDate", async () => {
    // MATCH_C (Jun 10) is earlier than MATCH_A (Jun 11) — pass in reverse order
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_A, MATCH_C]);
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      const cards = screen.getAllByTestId(/^gamecard-/);
      // MATCH_C (id 3, Jun 10) must appear before MATCH_A (id 1, Jun 11)
      expect(cards[0].props.testID).toBe("gamecard-3");
      expect(cards[1].props.testID).toBe("gamecard-1");
    });
  });
});
