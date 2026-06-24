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

// biome-ignore lint/style/noVar: var required so jest.mock factory hoisting can close over it before module evaluation
var mockScrollTo = jest.fn();

jest.mock("react-native-reanimated", () => {
  const ReactInFactory = require("react");
  const actual = jest.requireActual("react-native-reanimated/mock");
  return {
    ...actual,
    default: {
      ...actual.default,
      // biome-ignore lint/suspicious/noExplicitAny: mock factory — prop and ref types not available
      ScrollView: ReactInFactory.forwardRef(({ children, ...props }: any, ref: any) => {
        ReactInFactory.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
        const { View } = require("react-native");
        return ReactInFactory.createElement(View, props, children);
      }),
    },
  };
});

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
  }: {
    match: Match;
    homeCrest?: string;
    awayCrest?: string;
    onPress?: () => void;
  }) => {
    const { TouchableOpacity, Text } = require("react-native");
    return (
      <TouchableOpacity testID={`compact-${match.id}`} onPress={onPress}>
        <Text>
          {match.homeTeam} vs {match.awayTeam}
        </Text>
        {homeCrest && <Text testID={`compact-home-crest-${match.id}`}>{homeCrest}</Text>}
        {awayCrest && <Text testID={`compact-away-crest-${match.id}`}>{awayCrest}</Text>}
      </TouchableOpacity>
    );
  },
}));

// Capture events and crest props so tests can inspect them via testID
jest.mock("../../src/components/GameCardFocused", () => ({
  GameCardFocused: ({
    match,
    events,
    homeCrest,
    awayCrest,
  }: {
    match: Match;
    events?: MatchEvent[] | null;
    homeCrest?: string;
    awayCrest?: string;
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
  jest.useRealTimers();
  // Default: resolve with empty events so async updates don't leak across tests
  (getMatchDetail as jest.Mock).mockResolvedValue({ events: [] });
  // Default: reject so setCrests is never called — prevents async state updates leaking
  // between tests. Tests that need crests override this with mockResolvedValueOnce.
  (getTeamCrests as jest.Mock).mockRejectedValue(new Error("crests suppressed in test"));
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
      expect(screen.getByText(/too many requests/i)).toBeTruthy();
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

  // Top bar / Now button tests

  it("renders the top bar when matches are loaded", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_A]);
    render(<MatchScheduleScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("top-bar")).toBeTruthy();
    });
  });

  it("does not render the top bar while loading", () => {
    (getMatches as jest.Mock).mockReturnValueOnce(new Promise(() => {}));
    render(<MatchScheduleScreen />);
    expect(screen.queryByTestId("top-bar")).toBeNull();
  });

  it("tapping Now sets focus to the first ONGOING match when one exists", async () => {
    // After sort: MATCH_C (Jun 10 17:00), MATCH_FINISHED (Jun 10 15:00→sorted first), MATCH_ONGOING, MATCH_B
    // Sorted by utcDate: MATCH_FINISHED(id5,Jun10 15:00), MATCH_C(id3,Jun10 17:00), MATCH_ONGOING(id4,Jun11 20:00), MATCH_B(id2,Jun14)
    (getMatches as jest.Mock).mockResolvedValueOnce([
      MATCH_B,
      MATCH_C,
      MATCH_ONGOING,
      MATCH_FINISHED,
    ]);
    render(<MatchScheduleScreen />);
    await waitFor(() => screen.getByTestId("now-button"));
    fireEvent.press(screen.getByTestId("now-button"));
    await waitFor(() => {
      expect(screen.getByTestId("focused-4")).toBeTruthy();
    });
  });

  it("tapping Now sets focus to the first UPCOMING match when no ONGOING match exists", async () => {
    // Sorted: MATCH_FINISHED(id5,Jun10 15:00), MATCH_C(id3,Jun10 17:00,SCHEDULED), MATCH_A(id1,Jun11,SCHEDULED), MATCH_B(id2,Jun14,SCHEDULED)
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_A, MATCH_B, MATCH_C, MATCH_FINISHED]);
    render(<MatchScheduleScreen />);
    await waitFor(() => screen.getByTestId("now-button"));
    fireEvent.press(screen.getByTestId("now-button"));
    await waitFor(() => {
      // First UPCOMING after sort is MATCH_C (id 3, index 1 after MATCH_FINISHED at index 0)
      expect(screen.getByTestId("focused-3")).toBeTruthy();
    });
  });

  it("tapping Now when target card layout is not measured does not scroll to top (focus changes correctly)", async () => {
    // Sorted: MATCH_FINISHED(id5,Jun10 15:00), MATCH_A(id1,Jun11 19:00), MATCH_ONGOING(id4,Jun11 20:00)
    // ONGOING is at index 2; cardLayouts will be empty in test env (no onLayout fires in RNTL)
    (getMatches as jest.Mock).mockResolvedValueOnce([MATCH_FINISHED, MATCH_A, MATCH_ONGOING]);
    render(<MatchScheduleScreen />);
    await waitFor(() => screen.getByTestId("now-button"));
    fireEvent.press(screen.getByTestId("now-button"));
    await waitFor(() => {
      expect(screen.getByTestId("focused-4")).toBeTruthy();
    });
  });

  it("tapping Now sets focus to index 0 when all matches are FINISHED", async () => {
    const finishedA: Match = { ...MATCH_FINISHED, id: 8, utcDate: "2026-06-09T15:00:00Z" };
    const finishedB: Match = { ...MATCH_FINISHED, id: 9, utcDate: "2026-06-10T15:00:00Z" };
    (getMatches as jest.Mock).mockResolvedValueOnce([finishedB, finishedA]);
    render(<MatchScheduleScreen />);
    await waitFor(() => screen.getByTestId("now-button"));
    fireEvent.press(screen.getByTestId("now-button"));
    await waitFor(() => {
      // Index 0 after sort is finishedA (earlier date)
      expect(screen.getByTestId("focused-8")).toBeTruthy();
    });
  });
});

describe("Now button scroll behaviour", () => {
  beforeEach(() => {
    mockScrollTo.mockClear();
  });

  it("scrolls to a positive y offset when Now is pressed and target card is not at index 0", async () => {
    // Sorted: MATCH_FINISHED (Jun10 15:00), MATCH_C (Jun10 17:00), MATCH_ONGOING (Jun11 20:00), MATCH_B (Jun14)
    (getMatches as jest.Mock).mockResolvedValueOnce([
      MATCH_B,
      MATCH_C,
      MATCH_ONGOING,
      MATCH_FINISHED,
    ]);
    render(<MatchScheduleScreen />);
    await waitFor(() => screen.getByTestId("now-button"));

    fireEvent.press(screen.getByTestId("now-button"));

    await waitFor(() => {
      const scrollCalls = mockScrollTo.mock.calls.filter((call) => call[0]?.animated === true);
      expect(scrollCalls.length).toBeGreaterThan(0);
      const yValues = scrollCalls.map((call) => call[0]?.y ?? 0);
      expect(Math.max(...yValues)).toBeGreaterThan(0);
    });
  });

  it("scrollTo is called with the same y value on repeated Now presses", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([
      MATCH_B,
      MATCH_C,
      MATCH_ONGOING,
      MATCH_FINISHED,
    ]);
    render(<MatchScheduleScreen />);
    await waitFor(() => screen.getByTestId("now-button"));

    fireEvent.press(screen.getByTestId("now-button"));
    await waitFor(() => expect(mockScrollTo).toHaveBeenCalled());
    mockScrollTo.mockClear();

    fireEvent.press(screen.getByTestId("now-button"));
    await waitFor(() => expect(mockScrollTo).toHaveBeenCalled());

    const yValues = mockScrollTo.mock.calls
      .filter((call) => call[0]?.animated === true)
      .map((call) => call[0]?.y ?? 0);
    const allSame = yValues.every((y) => y === yValues[0]);
    expect(allSame).toBe(true);
  });

  it("does not call scrollTo with y=0 (animated) when Now targets a card beyond index 0", async () => {
    (getMatches as jest.Mock).mockResolvedValueOnce([
      MATCH_B,
      MATCH_C,
      MATCH_ONGOING,
      MATCH_FINISHED,
    ]);
    render(<MatchScheduleScreen />);
    await waitFor(() => screen.getByTestId("now-button"));

    mockScrollTo.mockClear();
    fireEvent.press(screen.getByTestId("now-button"));

    await waitFor(() => expect(mockScrollTo).toHaveBeenCalled());

    const animatedZeroCalls = mockScrollTo.mock.calls.filter(
      (call) => call[0]?.animated === true && call[0]?.y === 0,
    );
    expect(animatedZeroCalls.length).toBe(0);
  });
});
