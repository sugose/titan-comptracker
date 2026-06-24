import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";
import { CompetitionTile } from "../../src/components/CompetitionTile";
import type { Competition } from "../../src/types/competition";

const TODAY = "2026-06-24T12:00:00Z";

const COMPETITION: Competition = {
  id: 2000,
  code: "WC",
  name: "FIFA World Cup",
  area: "World",
  currentSeason: {
    startDate: "2026-06-11",
    endDate: "2026-07-19",
    currentMatchday: null,
  },
};

const COMPETITION_WITH_MATCHDAY: Competition = {
  id: 2021,
  code: "PL",
  name: "Premier League",
  area: "England",
  currentSeason: {
    startDate: "2025-08-16",
    endDate: "2026-05-24",
    currentMatchday: 34,
  },
};

const COMPETITION_NO_SEASON: Competition = {
  id: 2003,
  code: "DED",
  name: "Eredivisie",
  area: "Netherlands",
  currentSeason: null,
};

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(TODAY) });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("CompetitionTile", () => {
  it("renders the competition name", () => {
    render(<CompetitionTile competition={COMPETITION} onPress={jest.fn()} />);
    expect(screen.getByText("FIFA World Cup")).toBeTruthy();
  });

  it("renders the area", () => {
    render(<CompetitionTile competition={COMPETITION} onPress={jest.fn()} />);
    expect(screen.getByText("World")).toBeTruthy();
  });

  it("renders only the start year when season starts and ends in the same year", () => {
    render(<CompetitionTile competition={COMPETITION} onPress={jest.fn()} />);
    expect(screen.getByText("2026")).toBeTruthy();
  });

  it("renders start and end years spanning two calendar years", () => {
    render(<CompetitionTile competition={COMPETITION_WITH_MATCHDAY} onPress={jest.fn()} />);
    expect(screen.getByText("2025 – 2026")).toBeTruthy();
  });

  it("renders the current matchday when available", () => {
    render(<CompetitionTile competition={COMPETITION_WITH_MATCHDAY} onPress={jest.fn()} />);
    expect(screen.getByText("Matchday 34")).toBeTruthy();
  });

  it("does not render a matchday when currentMatchday is null", () => {
    render(<CompetitionTile competition={COMPETITION} onPress={jest.fn()} />);
    expect(screen.queryByText(/Matchday/)).toBeNull();
  });

  it("does not render season info when currentSeason is null", () => {
    render(<CompetitionTile competition={COMPETITION_NO_SEASON} onPress={jest.fn()} />);
    expect(screen.queryByText(/2\d\d\d/)).toBeNull();
    expect(screen.queryByText(/Matchday/)).toBeNull();
  });

  it("calls onPress when the tile is tapped", () => {
    const onPress = jest.fn();
    render(<CompetitionTile competition={COMPETITION} onPress={onPress} />);
    fireEvent.press(screen.getByText("FIFA World Cup"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders the Eredivisie tile with no season gracefully", () => {
    render(<CompetitionTile competition={COMPETITION_NO_SEASON} onPress={jest.fn()} />);
    expect(screen.getByText("Eredivisie")).toBeTruthy();
    expect(screen.getByText("Netherlands")).toBeTruthy();
  });

  // seasonStatus tests

  it("shows days remaining when season has not started yet", () => {
    const competition: Competition = {
      ...COMPETITION,
      currentSeason: {
        startDate: "2026-07-01",
        endDate: "2027-05-30",
        currentMatchday: null,
      },
    };
    render(<CompetitionTile competition={competition} onPress={jest.fn()} />);
    expect(screen.getByText(/Season starts/)).toBeTruthy();
    expect(screen.getByText(/in 7 days/)).toBeTruthy();
  });

  it("shows singular 'day' when exactly 1 day remains", () => {
    const competition: Competition = {
      ...COMPETITION,
      currentSeason: {
        startDate: "2026-06-25",
        endDate: "2027-05-30",
        currentMatchday: null,
      },
    };
    render(<CompetitionTile competition={competition} onPress={jest.fn()} />);
    expect(screen.getByText(/in 1 day$/)).toBeTruthy();
  });

  it("shows 'The season starts TODAY!' when startDate is today", () => {
    const competition: Competition = {
      ...COMPETITION,
      currentSeason: {
        startDate: "2026-06-24",
        endDate: "2027-05-30",
        currentMatchday: null,
      },
    };
    render(<CompetitionTile competition={competition} onPress={jest.fn()} />);
    expect(screen.getByText("The season starts TODAY!")).toBeTruthy();
  });

  it("shows matchday when season is in progress and currentMatchday is set", () => {
    render(<CompetitionTile competition={COMPETITION_WITH_MATCHDAY} onPress={jest.fn()} />);
    expect(screen.getByText("Matchday 34")).toBeTruthy();
  });

  it("shows nothing for season status when season is in progress and currentMatchday is null", () => {
    render(<CompetitionTile competition={COMPETITION} onPress={jest.fn()} />);
    expect(screen.queryByText(/Matchday/)).toBeNull();
    expect(screen.queryByText(/Season starts/)).toBeNull();
    expect(screen.queryByText(/TODAY/)).toBeNull();
  });
});
