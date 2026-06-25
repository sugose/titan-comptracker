import { render, screen } from "@testing-library/react-native";
import React from "react";
import { GameCardFocused } from "../../src/components/GameCardFocused";
import type { Match, MatchEvent } from "../../src/types/competition";

jest.mock("../../src/utils/time", () => ({
  formatInTimeZone: jest.fn((_utcDate: string, tz: string) => `formatted:${tz}`),
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

const GOAL_HOME: MatchEvent = { type: "GOAL", minute: 23, team: "HOME", scorer: "Hernandez" };
const GOAL_AWAY: MatchEvent = { type: "GOAL", minute: 67, team: "AWAY", scorer: "Pulisic" };
const BOOKING_YELLOW: MatchEvent = {
  type: "BOOKING",
  minute: 34,
  team: "AWAY",
  player: "Adams",
  card: "YELLOW_CARD",
};
const BOOKING_RED: MatchEvent = {
  type: "BOOKING",
  minute: 80,
  team: "HOME",
  player: "Moreno",
  card: "RED_CARD",
};
const SUB_HOME: MatchEvent = {
  type: "SUBSTITUTION",
  minute: 60,
  team: "HOME",
  playerOut: "Lozano",
  playerIn: "Antuna",
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

  // Events prop tests

  it("shows no events section when events is undefined", () => {
    render(
      <GameCardFocused
        match={SCHEDULED_MATCH}
        deviceTimeZone="Europe/Stockholm"
        events={undefined}
      />,
    );
    expect(screen.queryByTestId("events-loading")).toBeNull();
    expect(screen.queryByTestId("events-list")).toBeNull();
  });

  it("shows loading indicator when events is null", () => {
    render(
      <GameCardFocused match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" events={null} />,
    );
    expect(screen.getByTestId("events-loading")).toBeTruthy();
  });

  it("shows no events section when events is an empty array", () => {
    render(
      <GameCardFocused match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" events={[]} />,
    );
    expect(screen.queryByTestId("events-loading")).toBeNull();
    expect(screen.queryByTestId("events-list")).toBeNull();
  });

  it("renders a goal event on the home side with scorer name", () => {
    render(
      <GameCardFocused
        match={FINISHED_MATCH}
        deviceTimeZone="Europe/Stockholm"
        events={[GOAL_HOME]}
      />,
    );
    expect(screen.getByTestId("events-list")).toBeTruthy();
    expect(screen.getByText(/Hernandez/)).toBeTruthy();
    expect(screen.getByText(/23'/)).toBeTruthy();
  });

  it("renders an away goal event on the away side", () => {
    render(
      <GameCardFocused
        match={FINISHED_MATCH}
        deviceTimeZone="Europe/Stockholm"
        events={[GOAL_AWAY]}
      />,
    );
    expect(screen.getByText(/Pulisic/)).toBeTruthy();
  });

  it("renders yellow card booking with correct icon", () => {
    render(
      <GameCardFocused
        match={FINISHED_MATCH}
        deviceTimeZone="Europe/Stockholm"
        events={[BOOKING_YELLOW]}
      />,
    );
    expect(screen.getByText(/Adams/)).toBeTruthy();
    expect(screen.getByText(/🟨/)).toBeTruthy();
  });

  it("renders red card booking with correct icon", () => {
    render(
      <GameCardFocused
        match={FINISHED_MATCH}
        deviceTimeZone="Europe/Stockholm"
        events={[BOOKING_RED]}
      />,
    );
    expect(screen.getByText(/Moreno/)).toBeTruthy();
    expect(screen.getByText(/🟥/)).toBeTruthy();
  });

  it("renders substitution with playerOut and playerIn", () => {
    render(
      <GameCardFocused
        match={FINISHED_MATCH}
        deviceTimeZone="Europe/Stockholm"
        events={[SUB_HOME]}
      />,
    );
    expect(screen.getByText(/Lozano/)).toBeTruthy();
    expect(screen.getByText(/Antuna/)).toBeTruthy();
  });

  it("renders multiple events sorted by minute", () => {
    render(
      <GameCardFocused
        match={FINISHED_MATCH}
        deviceTimeZone="Europe/Stockholm"
        events={[GOAL_HOME, BOOKING_YELLOW, GOAL_AWAY]}
      />,
    );
    const minuteTexts = screen.getAllByText(/\d+'/);
    const minutes = minuteTexts.map((el) =>
      Number.parseInt(el.props.children.replace("'", ""), 10),
    );
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
  });

  it("does not render a reload button", () => {
    render(
      <GameCardFocused
        match={FINISHED_MATCH}
        deviceTimeZone="Europe/Stockholm"
        events={[GOAL_HOME]}
      />,
    );
    expect(screen.queryByTestId("reload-button")).toBeNull();
  });

  // Crest tests

  it("renders home crest image when homeCrest is provided", () => {
    render(
      <GameCardFocused
        match={SCHEDULED_MATCH}
        deviceTimeZone="Europe/Stockholm"
        homeCrest="https://example.com/mexico.png"
      />,
    );
    expect(screen.getByTestId("home-crest")).toBeTruthy();
  });

  it("renders away crest image when awayCrest is provided", () => {
    render(
      <GameCardFocused
        match={SCHEDULED_MATCH}
        deviceTimeZone="Europe/Stockholm"
        awayCrest="https://example.com/usa.png"
      />,
    );
    expect(screen.getByTestId("away-crest")).toBeTruthy();
  });

  it("does not render home crest when homeCrest is not provided", () => {
    render(<GameCardFocused match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.queryByTestId("home-crest")).toBeNull();
  });

  it("does not render away crest when awayCrest is not provided", () => {
    render(<GameCardFocused match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.queryByTestId("away-crest")).toBeNull();
  });

  // favouriteTeams star tests

  it("renders star next to home team when homeTeam is in favouriteTeams", () => {
    render(
      <GameCardFocused
        match={SCHEDULED_MATCH}
        deviceTimeZone="Europe/Stockholm"
        favouriteTeams={new Set(["Mexico"])}
      />,
    );
    expect(screen.getByTestId("favourite-star-home-1")).toBeTruthy();
  });

  it("renders star next to away team when awayTeam is in favouriteTeams", () => {
    render(
      <GameCardFocused
        match={SCHEDULED_MATCH}
        deviceTimeZone="Europe/Stockholm"
        favouriteTeams={new Set(["USA"])}
      />,
    );
    expect(screen.getByTestId("favourite-star-away-1")).toBeTruthy();
  });

  it("does not render home star when homeTeam is not in favouriteTeams", () => {
    render(
      <GameCardFocused
        match={SCHEDULED_MATCH}
        deviceTimeZone="Europe/Stockholm"
        favouriteTeams={new Set(["USA"])}
      />,
    );
    expect(screen.queryByTestId("favourite-star-home-1")).toBeNull();
  });

  it("does not render away star when awayTeam is not in favouriteTeams", () => {
    render(
      <GameCardFocused
        match={SCHEDULED_MATCH}
        deviceTimeZone="Europe/Stockholm"
        favouriteTeams={new Set(["Mexico"])}
      />,
    );
    expect(screen.queryByTestId("favourite-star-away-1")).toBeNull();
  });

  it("renders no stars when favouriteTeams prop is absent", () => {
    render(<GameCardFocused match={SCHEDULED_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.queryByTestId("favourite-star-home-1")).toBeNull();
    expect(screen.queryByTestId("favourite-star-away-1")).toBeNull();
  });
});
