import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";
import { GameCardCompact } from "../../src/components/GameCardCompact";
import type { Match } from "../../src/types/competition";

jest.mock("../../src/utils/time", () => ({
  formatInTimeZone: jest.fn((_utcDate: string, tz: string) => `formatted:${tz}`),
  getVenueTimeZone: jest.fn(() => "UTC"),
}));

jest.mock("../../src/utils/gameState", () => ({
  gameStateLabel: jest.fn((s: string) => s),
  showScore: jest.fn(() => false),
}));

const SCHEDULED_MATCH: Match = {
  id: 1,
  utcDate: "2026-06-11T19:00:00Z",
  status: "SCHEDULED",
  homeTeam: "Mexico",
  awayTeam: "USA",
  venue: { name: "Azteca", city: "Mexico City", country: "Mexico" },
};

const FINISHED_MATCH: Match = {
  id: 2,
  utcDate: "2026-06-14T22:00:00Z",
  status: "FINISHED",
  homeTeam: "Canada",
  awayTeam: "Argentina",
  venue: { name: "BMO Field", city: "Toronto", country: "Canada" },
  score: { home: 2, away: 1 },
};

const IN_PLAY_MATCH: Match = {
  id: 3,
  utcDate: "2026-06-15T20:00:00Z",
  status: "IN_PLAY",
  homeTeam: "Brazil",
  awayTeam: "Germany",
  venue: { name: "MetLife", city: "East Rutherford", country: "USA" },
  score: { home: 1, away: 0 },
};

beforeEach(() => {
  jest.clearAllMocks();
  const { gameStateLabel, showScore } = jest.requireMock("../../src/utils/gameState");
  gameStateLabel.mockImplementation((s: string) => s);
  showScore.mockImplementation(() => false);
});

describe("GameCardCompact", () => {
  it("renders the home team name", () => {
    render(<GameCardCompact match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("Mexico")).toBeTruthy();
  });

  it("renders the away team name", () => {
    render(<GameCardCompact match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("USA")).toBeTruthy();
  });

  it("renders kick-off time in device local time zone", () => {
    render(<GameCardCompact match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("formatted:Europe/Stockholm")).toBeTruthy();
  });

  it("renders the game state badge using gameStateLabel", () => {
    const { gameStateLabel } = jest.requireMock("../../src/utils/gameState");
    gameStateLabel.mockReturnValueOnce("UPCOMING");
    render(<GameCardCompact match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("UPCOMING")).toBeTruthy();
  });

  it("hides score when showScore returns false (UPCOMING)", () => {
    const { showScore } = jest.requireMock("../../src/utils/gameState");
    showScore.mockReturnValueOnce(false);
    render(<GameCardCompact match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.queryByTestId("compact-score")).toBeNull();
  });

  it("shows score when showScore returns true (FINISHED)", () => {
    const { showScore } = jest.requireMock("../../src/utils/gameState");
    showScore.mockReturnValueOnce(true);
    render(<GameCardCompact match={FINISHED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByTestId("compact-score")).toBeTruthy();
    expect(screen.getByText("2 - 1")).toBeTruthy();
  });

  it("shows score when showScore returns true (IN_PLAY)", () => {
    const { showScore } = jest.requireMock("../../src/utils/gameState");
    showScore.mockReturnValueOnce(true);
    render(<GameCardCompact match={IN_PLAY_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByTestId("compact-score")).toBeTruthy();
    expect(screen.getByText("1 - 0")).toBeTruthy();
  });

  it("renders null scores as dashes when showScore is true", () => {
    const { showScore } = jest.requireMock("../../src/utils/gameState");
    showScore.mockReturnValueOnce(true);
    const matchNullScore: Match = {
      ...IN_PLAY_MATCH,
      score: { home: null, away: null },
    };
    render(<GameCardCompact match={matchNullScore} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("- - -")).toBeTruthy();
  });

  it("does not render venue name or location", () => {
    render(<GameCardCompact match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.queryByText("Azteca")).toBeNull();
    expect(screen.queryByText(/Mexico City/)).toBeNull();
  });

  // Crest tests

  it("renders home crest image when homeCrest is provided", () => {
    render(
      <GameCardCompact
        match={SCHEDULED_MATCH}
        deviceTimeZone="Europe/Stockholm"
        homeCrest="https://example.com/mexico.png"
      />,
    );
    expect(screen.getByTestId("home-crest")).toBeTruthy();
  });

  it("renders away crest image when awayCrest is provided", () => {
    render(
      <GameCardCompact
        match={SCHEDULED_MATCH}
        deviceTimeZone="Europe/Stockholm"
        awayCrest="https://example.com/usa.png"
      />,
    );
    expect(screen.getByTestId("away-crest")).toBeTruthy();
  });

  it("does not render home crest when homeCrest is not provided", () => {
    render(<GameCardCompact match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.queryByTestId("home-crest")).toBeNull();
  });

  it("does not render away crest when awayCrest is not provided", () => {
    render(<GameCardCompact match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.queryByTestId("away-crest")).toBeNull();
  });

  // onPress / tap-to-focus tests

  it("calls onPress when card is tapped", () => {
    const onPress = jest.fn();
    render(
      <GameCardCompact
        match={SCHEDULED_MATCH}
        deviceTimeZone="Europe/Stockholm"
        onPress={onPress}
      />,
    );
    fireEvent.press(screen.getByTestId("compact-card"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not throw when card is rendered without onPress", () => {
    expect(() =>
      render(<GameCardCompact match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />),
    ).not.toThrow();
  });
});
