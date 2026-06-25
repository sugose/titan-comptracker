import { fireEvent, render, screen } from "@testing-library/react-native";
import type React from "react";
import { FlatMatchSchedule, smartFocusIndex } from "../../src/components/FlatMatchSchedule";
import type { Match } from "../../src/types/competition";

jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated/mock");
  return {
    ...actual,
    default: {
      ...actual.default,
      // biome-ignore lint/suspicious/noExplicitAny: mock factory
      ScrollView: ({ children, ...props }: any) => {
        const { ScrollView } = require("react-native");
        return <ScrollView {...props}>{children}</ScrollView>;
      },
    },
    useAnimatedRef: () => ({ current: null }),
    useAnimatedScrollHandler: jest.fn(() => jest.fn()),
    scrollTo: jest.fn(),
    runOnUI: (fn: () => void) => fn,
  };
});

jest.mock("react-native-gesture-handler", () => {
  const { View } = require("react-native");
  return {
    GestureDetector: ({ children }: { children: React.ReactNode }) => (
      <View testID="flat-gesture-wrapper">{children}</View>
    ),
    Gesture: { Pan: () => ({ onBegin: () => ({}) }) },
  };
});

jest.mock("../../src/components/GameCardFocused", () => ({
  GameCardFocused: ({ match }: { match: Match }) => {
    const { View, Text } = require("react-native");
    return (
      <View testID={`focused-${match.id}`}>
        <Text>
          {match.homeTeam} vs {match.awayTeam}
        </Text>
      </View>
    );
  },
}));

const SCHEDULED: Match = {
  id: 1,
  utcDate: "2026-06-14T22:00:00Z",
  status: "SCHEDULED",
  homeTeam: "A",
  awayTeam: "B",
  venue: { name: "V", city: "", country: "" },
};

const ONGOING: Match = {
  id: 2,
  utcDate: "2026-06-14T20:00:00Z",
  status: "IN_PLAY",
  homeTeam: "C",
  awayTeam: "D",
  venue: { name: "V", city: "", country: "" },
};

const FINISHED: Match = {
  id: 3,
  utcDate: "2026-06-13T18:00:00Z",
  status: "FINISHED",
  homeTeam: "E",
  awayTeam: "F",
  venue: { name: "V", city: "", country: "" },
};

const UPCOMING: Match = {
  id: 4,
  utcDate: "2026-06-15T16:00:00Z",
  status: "TIMED",
  homeTeam: "G",
  awayTeam: "H",
  venue: { name: "V", city: "", country: "" },
};

const defaultProps = {
  crests: {},
  matchEvents: {},
  deviceTimeZone: "UTC",
};

describe("FlatMatchSchedule", () => {
  it("renders a card for each match", () => {
    render(<FlatMatchSchedule matches={[SCHEDULED, ONGOING, FINISHED]} {...defaultProps} />);
    expect(screen.getByTestId("focused-1")).toBeTruthy();
    expect(screen.getByTestId("focused-2")).toBeTruthy();
    expect(screen.getByTestId("focused-3")).toBeTruthy();
  });

  it("renders the top bar", () => {
    render(<FlatMatchSchedule matches={[SCHEDULED]} {...defaultProps} />);
    expect(screen.getByTestId("flat-top-bar")).toBeTruthy();
  });

  it("renders the Now button", () => {
    render(<FlatMatchSchedule matches={[SCHEDULED]} {...defaultProps} />);
    expect(screen.getByTestId("flat-now-button")).toBeTruthy();
  });

  it("all cards rendered uniformly — all use focused-* testID, no compact-* testID", () => {
    render(<FlatMatchSchedule matches={[SCHEDULED, ONGOING, FINISHED]} {...defaultProps} />);
    expect(screen.getByTestId("focused-1")).toBeTruthy();
    expect(screen.getByTestId("focused-2")).toBeTruthy();
    expect(screen.getByTestId("focused-3")).toBeTruthy();
    expect(screen.queryByTestId("compact-1")).toBeNull();
    expect(screen.queryByTestId("compact-2")).toBeNull();
    expect(screen.queryByTestId("compact-3")).toBeNull();
  });

  it("renders an empty list when matches is empty", () => {
    render(<FlatMatchSchedule matches={[]} {...defaultProps} />);
    expect(screen.getByTestId("flat-now-button")).toBeTruthy();
    expect(screen.queryAllByTestId(/^focused-/).length).toBe(0);
  });

  it("pressing Now button does not throw when matches are present", () => {
    render(<FlatMatchSchedule matches={[FINISHED, ONGOING, SCHEDULED]} {...defaultProps} />);
    expect(() => fireEvent.press(screen.getByTestId("flat-now-button"))).not.toThrow();
  });

  it("pressing Now button does not throw when matches is empty", () => {
    render(<FlatMatchSchedule matches={[]} {...defaultProps} />);
    expect(() => fireEvent.press(screen.getByTestId("flat-now-button"))).not.toThrow();
  });

  it("GestureDetector wraps the scroll view", () => {
    render(<FlatMatchSchedule matches={[SCHEDULED]} {...defaultProps} />);
    expect(screen.getByTestId("flat-gesture-wrapper")).toBeTruthy();
  });
});

describe("smartFocusIndex", () => {
  it("returns the index of the first ONGOING match", () => {
    expect(smartFocusIndex([FINISHED, ONGOING, SCHEDULED])).toBe(1);
  });

  it("returns the index of the first UPCOMING match when no ONGOING exists", () => {
    // TIMED maps to UPCOMING
    expect(smartFocusIndex([FINISHED, UPCOMING, SCHEDULED])).toBe(1);
  });

  it("returns 0 when all matches are FINISHED", () => {
    expect(smartFocusIndex([FINISHED, FINISHED, FINISHED])).toBe(0);
  });

  it("prefers ONGOING over UPCOMING", () => {
    expect(smartFocusIndex([UPCOMING, ONGOING, SCHEDULED])).toBe(1);
  });
});
