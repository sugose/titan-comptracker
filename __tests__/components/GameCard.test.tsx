import { render, screen } from "@testing-library/react-native";
import React from "react";
import { GameCard } from "../../src/components/GameCard";
import type { Match } from "../../src/types/competition";

jest.mock("../../src/utils/time", () => ({
  formatInTimeZone: jest.fn((utcDate: string, tz: string) => `formatted:${tz}`),
  getVenueTimeZone: jest.fn(() => "America/Mexico_City"),
}));

const MATCH: Match = {
  id: 1,
  utcDate: "2026-06-11T19:00:00Z",
  status: "SCHEDULED",
  homeTeam: "Mexico",
  awayTeam: "USA",
  venue: {
    name: "Estadio Azteca",
    city: "Mexico City",
    country: "Mexico",
  },
};

describe("GameCard", () => {
  it("renders the home team name", () => {
    render(<GameCard match={MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("Mexico")).toBeTruthy();
  });

  it("renders the away team name", () => {
    render(<GameCard match={MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("USA")).toBeTruthy();
  });

  it("renders the venue arena name", () => {
    render(<GameCard match={MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("Estadio Azteca")).toBeTruthy();
  });

  it("renders the venue city and country", () => {
    render(<GameCard match={MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("Mexico City, Mexico")).toBeTruthy();
  });

  it("renders the match status badge", () => {
    render(<GameCard match={MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("SCHEDULED")).toBeTruthy();
  });

  it("renders kick-off time in venue local time zone", () => {
    render(<GameCard match={MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("formatted:America/Mexico_City")).toBeTruthy();
  });

  it("renders kick-off time in device local time zone", () => {
    render(<GameCard match={MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("formatted:Europe/Stockholm")).toBeTruthy();
  });

  it("does not display scores", () => {
    render(<GameCard match={MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.queryByText(/score/i)).toBeNull();
    expect(screen.queryByText(/[0-9]+-[0-9]+/)).toBeNull();
  });

  it("handles an unknown status value gracefully by displaying the raw string", () => {
    const matchWithUnknownStatus = {
      ...MATCH,
      status: "UNKNOWN_STATUS" as Match["status"],
    };
    render(<GameCard match={matchWithUnknownStatus} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("UNKNOWN_STATUS")).toBeTruthy();
  });

  it("renders a LIVE status badge", () => {
    const liveMatch = { ...MATCH, status: "LIVE" as const };
    render(<GameCard match={liveMatch} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("LIVE")).toBeTruthy();
  });

  it("renders a FINISHED status badge", () => {
    const finishedMatch = { ...MATCH, status: "FINISHED" as const };
    render(<GameCard match={finishedMatch} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("FINISHED")).toBeTruthy();
  });

  it("renders venue city and country as UTC fallback label when city is empty", () => {
    const { formatInTimeZone, getVenueTimeZone } = jest.requireMock("../../src/utils/time");
    getVenueTimeZone.mockReturnValueOnce("UTC");
    formatInTimeZone.mockImplementation((utcDate: string, tz: string) => `formatted:${tz}`);

    const matchNoCity: Match = {
      ...MATCH,
      venue: { name: "Unknown Arena", city: "", country: "" },
    };
    render(<GameCard match={matchNoCity} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByText("formatted:UTC")).toBeTruthy();
  });
});
