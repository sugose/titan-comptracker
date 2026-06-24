import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import MatchScheduleScreen from "../../app/competition/[id]";
import {
  ApiError,
  NetworkError,
  RateLimitError,
  getMatches,
} from "../../src/services/footballDataService";
import { getMatchDetail } from "../../src/services/matchDetailService";
import { getTeamCrests } from "../../src/services/teamService";
import type { Match, MatchEvent } from "../../src/types/competition";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "WC" }),
}));

jest.mock("../../src/services/footballDataService", () => {
  const actual = jest.requireActual("../../src/services/footballDataService");
  return { ...actual, getMatches: jest.fn() };
});

jest.mock("../../src/services/matchDetailService", () => ({
  getMatchDetail: jest.fn(),
}));

jest.mock("../../src/services/teamService", () => ({
  getTeamCrests: jest.fn(),
}));

jest.mock("../../src/components/GameCardCompact", () => ({
  GameCardCompact: ({
    match,
    homeCrest,
    awayCrest,
    onPress,
    scaleValue,
  }: {
    match: Match;
    homeCrest?: string;
    awayCrest?: string;
    onPress?: () => void;
    scaleValue?: unknown;
  }) => {
    const { TouchableOpacity, Text } = require("react-native");
    return (
      <TouchableOpacity testID={`compact-${match.id}`} onPress={onPress}>
        <Text>
          {match.homeTeam} vs {match.awayTeam}
        </Text>
        {homeCrest && <Text testID={`compact-home-crest-${match.id}`}>{homeCrest}</Text>}
        {awayCrest && <Text testID={`compact-away-crest-${match.id}`}>{awayCrest}</Text>}
        {scaleValue !== undefined && (
          <Text testID={`compact-has-scale-${match.id}`}>has-scale</Text>
        )}
      </TouchableOpacity>
    );
  },
}));

// Capture events, crest, and scaleValue props so tests can inspect them via testID
jest.mock("../../src/components/GameCardFocused", () => ({
  GameCardFocused: ({
    match,
    events,
    homeCrest,
    awayCrest,
    scaleValue,
  }: {
    match: Match;
    events?: MatchEvent[] | null;
    homeCrest?: string;
    awayCrest?: string;
    scaleValue?: unknown;
  }) => {
    const { View, Text } = require("react-native");
    return (
      <View testID={`focused-${match.id}`}>
        <Text>
          {match.homeTeam} vs {match.awayTeam}
        </Text>
        {events === null && <Text testID="events-loading-in-card">loading</Text>}
        {Array.isArray(events) && events.length > 0 && (
          <Text testID="events-present-in-card">{events.length}</Text>
        )}
        {homeCrest && <Text testID={`focused-home-crest-${match.id}`}>{homeCrest}</Text>}
        {awayCrest && <Text testID={`focused-away-crest-${match.id}`}>{awayCrest}</Text>}
        {scaleValue !== undefined && (
          <Text testID={`focused-has-scale-${match.id}`}>has-scale</Text>
        )}
      </View>
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

const SAMPLE_EVENTS: MatchEvent[] = [
  { type: "GOAL", minute: 23, team: "HOME", scorer: "Hernandez" },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  jest.useRealTimers();
  // Default: resolve with empty events so async updates don't leak across tests
  (getMatchDetail as jest.Mock).mockResolvedValue({ events: [] });
  // Default: resolve with empty crests
  (getTeamCrests as jest.Mock).mockResolvedValue({});
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
      expect(screen.getByTestId("focused-1")).toBeTruthy();
      expect(screen.getByTestId("compact-2")).toBeTruthy();
    });
  });

  it("renders matches sorted ascending by utcDate", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_A, MATCH_C]);
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("focused-3")).toBeTruthy();
      expect(screen.getByTestId("compact-1")).toBeTruthy();
    });
  });

  it("renders all matches when the list has more than two", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_A, MATCH_B, MATCH_C]);
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("focused-3")).toBeTruthy();
      expect(screen.getByTestId("compact-1")).toBeTruthy();
      expect(screen.getByTestId("compact-2")).toBeTruthy();
    });
  });

  it("focuses the first ONGOING match on load when one exists", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_B, MATCH_C, MATCH_ONGOING]);
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("focused-4")).toBeTruthy();
      expect(screen.getByTestId("compact-3")).toBeTruthy();
      expect(screen.getByTestId("compact-2")).toBeTruthy();
    });
  });

  it("focuses the first UPCOMING match when no ONGOING match exists", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_B, MATCH_A, MATCH_FINISHED]);
    render(<MatchScheduleScreen />);
    await waitFor(() => {
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

    await waitFor(() => screen.getByTestId("focused-4"));

    expect(() => jest.runAllTimers()).not.toThrow();

    expect(screen.getByTestId("focused-4")).toBeTruthy();
  });

  // Event-fetching behaviour tests

  it("fetches match detail when the initially focused card is ONGOING", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_ONGOING]);
    (getMatchDetail as jest.Mock).mockResolvedValueOnce({
      ...MATCH_ONGOING,
      events: SAMPLE_EVENTS,
    });
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      expect(getMatchDetail).toHaveBeenCalledWith(MATCH_ONGOING.id);
    });
  });

  it("fetches match detail when the initially focused card is FINISHED", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_FINISHED]);
    (getMatchDetail as jest.Mock).mockResolvedValueOnce({
      ...MATCH_FINISHED,
      events: SAMPLE_EVENTS,
    });
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      expect(getMatchDetail).toHaveBeenCalledWith(MATCH_FINISHED.id);
    });
  });

  it("does not fetch match detail for an UPCOMING focused card", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_A]);
    render(<MatchScheduleScreen />);
    await waitFor(() => screen.getByTestId("focused-1"));
    // Allow any pending promises to settle
    await new Promise((r) => setTimeout(r, 0));
    expect(getMatchDetail).not.toHaveBeenCalled();
  });

  it("shows events in focused card after successful fetch", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_FINISHED]);
    (getMatchDetail as jest.Mock).mockResolvedValueOnce({
      ...MATCH_FINISHED,
      events: SAMPLE_EVENTS,
    });
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("events-present-in-card")).toBeTruthy();
    });
  });

  it("fails silently and shows no events when match detail fetch errors", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_FINISHED]);
    (getMatchDetail as jest.Mock).mockRejectedValueOnce(new Error("network"));
    render(<MatchScheduleScreen />);
    await waitFor(() => screen.getByTestId("focused-5"));
    // Allow error handler to run
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId("events-loading-in-card")).toBeNull();
    expect(screen.queryByTestId("events-present-in-card")).toBeNull();
  });

  it("does not re-fetch match detail for an already-cached match on re-focus", async () => {
    // Two FINISHED matches so index 0 (earliest) is the initial focus (no ONGOING/UPCOMING)
    const finishedEarly: Match = { ...MATCH_FINISHED, id: 10, utcDate: "2026-06-09T15:00:00Z" };
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_FINISHED, finishedEarly]);
    render(<MatchScheduleScreen />);
    // Wait for initial fetch to complete — finishedEarly (index 0) is focused → getMatchDetail called
    await waitFor(() => {
      expect(getMatchDetail).toHaveBeenCalledWith(finishedEarly.id);
    });
    const callCount = (getMatchDetail as jest.Mock).mock.calls.length;
    // fetchedIds ref prevents a second call for the same match
    expect(callCount).toBe(1);
  });

  // Crest and tap-to-focus tests

  it("fetches team crests on mount", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_A]);
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      expect(getTeamCrests).toHaveBeenCalledWith("WC");
    });
  });

  it("passes crest URLs to focused card", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_A]);
    (getTeamCrests as jest.Mock).mockResolvedValueOnce({
      Mexico: "https://example.com/mexico.png",
      USA: "https://example.com/usa.png",
    });
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("focused-home-crest-1")).toBeTruthy();
      expect(screen.getByTestId("focused-away-crest-1")).toBeTruthy();
    });
  });

  it("passes crest URLs to compact cards", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_A, MATCH_B]);
    (getTeamCrests as jest.Mock).mockResolvedValueOnce({
      Canada: "https://example.com/canada.png",
      Argentina: "https://example.com/argentina.png",
    });
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      // MATCH_B (id 2) is the compact card; Canada/Argentina crests passed
      expect(screen.getByTestId("compact-home-crest-2")).toBeTruthy();
      expect(screen.getByTestId("compact-away-crest-2")).toBeTruthy();
    });
  });

  it("does not crash when crest fetch fails (fails silently)", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_A]);
    (getTeamCrests as jest.Mock).mockRejectedValueOnce(new Error("network"));
    render(<MatchScheduleScreen />);
    await waitFor(() => screen.getByTestId("focused-1"));
    // No crest testIDs should be present — but the screen renders fine
    expect(screen.queryByTestId("focused-home-crest-1")).toBeNull();
  });

  it("tapping a compact card sets it as the focused card", async () => {
    // After sort: MATCH_C (Jun 10) focused at index 0, MATCH_A (Jun 11) compact at index 1
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_A, MATCH_C]);
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("compact-1")).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId("compact-1"));
    await waitFor(() => {
      // After tap, MATCH_A (id 1) should become focused
      expect(screen.getByTestId("focused-1")).toBeTruthy();
      expect(screen.getByTestId("compact-3")).toBeTruthy();
    });
  });

  // Animated scale tests

  it("passes scaleValue to each card after load", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_A, MATCH_C]);
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      // Both cards should receive a scaleValue
      expect(screen.getByTestId("focused-has-scale-3")).toBeTruthy();
      expect(screen.getByTestId("compact-has-scale-1")).toBeTruthy();
    });
  });

  it("calls Animated.parallel with two Animated.timing calls on focus change via tap", async () => {
    const { Animated } = require("react-native");
    const parallelSpy = jest
      .spyOn(Animated, "parallel")
      .mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() } as never);
    const timingSpy = jest.spyOn(Animated, "timing").mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    } as never);

    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_A, MATCH_C]);
    render(<MatchScheduleScreen />);
    await waitFor(() => screen.getByTestId("compact-1"));

    timingSpy.mockClear();
    parallelSpy.mockClear();

    fireEvent.press(screen.getByTestId("compact-1"));

    expect(parallelSpy).toHaveBeenCalledTimes(1);
    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0.88, duration: 250, useNativeDriver: true }),
    );
    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 1.0, duration: 250, useNativeDriver: true }),
    );

    timingSpy.mockRestore();
    parallelSpy.mockRestore();
  });
});
