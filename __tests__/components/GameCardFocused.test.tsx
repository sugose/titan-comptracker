import { render, screen } from "@testing-library/react-native";
import React from "react";
import { GameCardFocused } from "../../src/components/GameCardFocused";
import type { Match } from "../../src/types/competition";

jest.mock("../../src/utils/time", () => ({
  formatInTimeZone: jest.fn((_utcDate: string, tz: string) => `formatted:${tz}`),
  getVenueTimeZone: jest.fn(() => "America/Mexico_City"),
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
  venue: { name: "Estadio Azteca", city: "Mexico City", country: "Mexico" },
};

const FINISHED_MATCH: Match = {
  id: 2,
  utcDate: "2026-06-14T22:00:00Z",
  status: "FINISHED",
  homeTeam: "Canada",
  awayTeam: "Argentina",
  venue: { name: "BMO Field", city: "Toronto", country: "Canada" },
  score: { home: 3, away: 2 },
};

beforeEach(() => {
  jest.clearAllMocks();
  const { gameStateLabel, showScore } = jest.requireMock("../../src/utils/gameState");
  gameStateLabel.mockImplementation((s: string) => s);
  showScore.mockImplementation(() => false);
});

describe("GameCardFocused", () => {
  it("renders the home team name", () => {
    render(<GameCardFocused match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("Mexico")).toBeTruthy();
  });

  it("renders the away team name", () => {
    render(<GameCardFocused match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("USA")).toBeTruthy();
  });

  it("renders kick-off time in device local time zone", () => {
    render(<GameCardFocused match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("formatted:Europe/Stockholm")).toBeTruthy();
  });

  it("renders kick-off time in venue local time zone", () => {
    render(<GameCardFocused match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("formatted:America/Mexico_City")).toBeTruthy();
  });

  it("renders the venue arena name", () => {
    render(<GameCardFocused match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("Estadio Azteca")).toBeTruthy();
  });

  it("renders the game state badge using gameStateLabel", () => {
    const { gameStateLabel } = jest.requireMock("../../src/utils/gameState");
    gameStateLabel.mockReturnValueOnce("UPCOMING");
    render(<GameCardFocused match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("UPCOMING")).toBeTruthy();
  });

  it("hides score when showScore returns false", () => {
    const { showScore } = jest.requireMock("../../src/utils/gameState");
    showScore.mockReturnValueOnce(false);
    render(<GameCardFocused match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.queryByTestId("focused-score")).toBeNull();
  });

  it("shows score when showScore returns true (FINISHED)", () => {
    const { showScore } = jest.requireMock("../../src/utils/gameState");
    showScore.mockReturnValueOnce(true);
    render(<GameCardFocused match={FINISHED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByTestId("focused-score")).toBeTruthy();
    expect(screen.getByText("3 - 2")).toBeTruthy();
  });

  it("renders null scores as dashes when showScore is true", () => {
    const { showScore } = jest.requireMock("../../src/utils/gameState");
    showScore.mockReturnValueOnce(true);
    const matchNullScore: Match = {
      ...FINISHED_MATCH,
      score: { home: null, away: null },
    };
    render(<GameCardFocused match={matchNullScore} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("- - -")).toBeTruthy();
  });

  it("applies a scale transform larger than GameCardCompact", () => {
    render(<GameCardFocused match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    const card = screen.getByTestId("focused-card");
    const transform = card.props.style?.transform;
    const scaleEntry =
      Array.isArray(transform) && transform.find((t: Record<string, number>) => "scale" in t);
    expect(scaleEntry).toBeTruthy();
    expect(scaleEntry.scale).toBeGreaterThan(0.88);
  });
});
