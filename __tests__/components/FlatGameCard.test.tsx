import { render, screen } from "@testing-library/react-native";
import { FlatGameCard } from "../../src/components/FlatGameCard";
import type { Match } from "../../src/types/competition";

jest.mock("expo-image", () => ({
  Image: ({ testID }: { testID?: string }) => {
    const { View } = require("react-native");
    return <View testID={testID} />;
  },
}));

const BASE_MATCH: Match = {
  id: 10,
  utcDate: "2026-06-14T20:00:00Z",
  status: "SCHEDULED",
  homeTeam: "Brazil",
  awayTeam: "Germany",
  venue: { name: "Stadium", city: "City", country: "Country" },
};

const FINISHED_MATCH: Match = {
  ...BASE_MATCH,
  id: 11,
  status: "FINISHED",
  score: { home: 3, away: 1 },
};

const defaultProps = {
  deviceTimeZone: "UTC",
};

describe("FlatGameCard", () => {
  it("renders home and away team names", () => {
    render(<FlatGameCard match={BASE_MATCH} {...defaultProps} />);
    expect(screen.getByText("Brazil")).toBeTruthy();
    expect(screen.getByText("Germany")).toBeTruthy();
  });

  it("renders score when match is FINISHED", () => {
    render(<FlatGameCard match={FINISHED_MATCH} {...defaultProps} />);
    expect(screen.getByTestId("flat-card-score")).toBeTruthy();
    expect(screen.getByText("3 - 1")).toBeTruthy();
  });

  it("renders home crest when provided", () => {
    render(
      <FlatGameCard
        match={BASE_MATCH}
        {...defaultProps}
        homeCrest="https://example.com/brazil.svg"
      />,
    );
    expect(screen.getByTestId("home-crest")).toBeTruthy();
  });

  it("renders away crest when provided", () => {
    render(
      <FlatGameCard
        match={BASE_MATCH}
        {...defaultProps}
        awayCrest="https://example.com/germany.svg"
      />,
    );
    expect(screen.getByTestId("away-crest")).toBeTruthy();
  });

  it("renders favourite star next to home team when in favouriteTeams", () => {
    render(
      <FlatGameCard match={BASE_MATCH} {...defaultProps} favouriteTeams={new Set(["Brazil"])} />,
    );
    expect(screen.getByTestId(`favourite-star-home-${BASE_MATCH.id}`)).toBeTruthy();
    expect(screen.queryByTestId(`favourite-star-away-${BASE_MATCH.id}`)).toBeNull();
  });

  it("renders favourite star next to away team when in favouriteTeams", () => {
    render(
      <FlatGameCard match={BASE_MATCH} {...defaultProps} favouriteTeams={new Set(["Germany"])} />,
    );
    expect(screen.getByTestId(`favourite-star-away-${BASE_MATCH.id}`)).toBeTruthy();
    expect(screen.queryByTestId(`favourite-star-home-${BASE_MATCH.id}`)).toBeNull();
  });

  it("does NOT render venue section", () => {
    render(<FlatGameCard match={BASE_MATCH} {...defaultProps} />);
    expect(screen.queryByText("Stadium")).toBeNull();
    expect(screen.queryByTestId("flat-card-venue")).toBeNull();
  });

  it("does NOT render events section", () => {
    render(<FlatGameCard match={BASE_MATCH} {...defaultProps} />);
    expect(screen.queryByTestId("flat-card-events")).toBeNull();
    expect(screen.queryByTestId("events-loading")).toBeNull();
  });

  it("does not show 'Your time' label", () => {
    render(<FlatGameCard match={BASE_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.queryByText("Your time")).toBeNull();
  });

  it("shows kick-off time with abbreviated timezone", () => {
    render(<FlatGameCard match={BASE_MATCH} deviceTimeZone="Europe/Stockholm" />);
    expect(screen.getByTestId("flat-card-time")).toBeTruthy();
  });
});
