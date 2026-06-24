import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import CompetitionSelectScreen from "../../app/index";
import {
  ApiError,
  NetworkError,
  RateLimitError,
  getCompetitions,
} from "../../src/services/competitionService";
import type { Competition } from "../../src/types/competition";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("../../src/services/competitionService", () => {
  const actual = jest.requireActual("../../src/services/competitionService");
  return { ...actual, getCompetitions: jest.fn() };
});

jest.mock("../../src/components/CompetitionTile", () => ({
  CompetitionTile: ({
    competition,
    onPress,
  }: {
    competition: Competition;
    onPress: () => void;
  }) => {
    const { TouchableOpacity, Text } = require("react-native");
    return (
      <TouchableOpacity testID={`tile-${competition.code}`} onPress={onPress}>
        <Text>{competition.name}</Text>
      </TouchableOpacity>
    );
  },
}));

const WC: Competition = {
  id: 2000,
  code: "WC",
  name: "FIFA World Cup",
  area: "World",
  currentSeason: { startDate: "2026-06-11", endDate: "2026-07-19", currentMatchday: null },
};

const PL: Competition = {
  id: 2021,
  code: "PL",
  name: "Premier League",
  area: "England",
  currentSeason: { startDate: "2025-08-16", endDate: "2026-05-24", currentMatchday: 34 },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CompetitionSelectScreen", () => {
  it("shows a loading indicator while fetching", () => {
    (getCompetitions as jest.Mock).mockReturnValueOnce(new Promise(() => {}));
    render(<CompetitionSelectScreen />);
    expect(screen.getByTestId("loading-indicator")).toBeTruthy();
  });

  it("renders a tile for each competition on success", async () => {
    (getCompetitions as jest.Mock).mockResolvedValueOnce([WC, PL]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("tile-WC")).toBeTruthy();
      expect(screen.getByTestId("tile-PL")).toBeTruthy();
    });
  });

  it("navigates to /competition/WC when the WC tile is tapped", async () => {
    (getCompetitions as jest.Mock).mockResolvedValueOnce([WC]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => screen.getByTestId("tile-WC"));
    fireEvent.press(screen.getByTestId("tile-WC"));
    expect(mockPush).toHaveBeenCalledWith("/competition/WC");
  });

  it("navigates to /competition/PL when the PL tile is tapped", async () => {
    (getCompetitions as jest.Mock).mockResolvedValueOnce([PL]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => screen.getByTestId("tile-PL"));
    fireEvent.press(screen.getByTestId("tile-PL"));
    expect(mockPush).toHaveBeenCalledWith("/competition/PL");
  });

  it("shows a rate limit error message when RateLimitError is thrown", async () => {
    (getCompetitions as jest.Mock).mockRejectedValueOnce(new RateLimitError(null));
    render(<CompetitionSelectScreen />);
    await waitFor(() => {
      expect(screen.getByText(/too many requests/i)).toBeTruthy();
    });
  });

  it("shows a network error message when NetworkError is thrown", async () => {
    (getCompetitions as jest.Mock).mockRejectedValueOnce(new NetworkError(new Error("offline")));
    render(<CompetitionSelectScreen />);
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeTruthy();
    });
  });

  it("shows an API error message when ApiError is thrown", async () => {
    (getCompetitions as jest.Mock).mockRejectedValueOnce(new ApiError(500));
    render(<CompetitionSelectScreen />);
    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeTruthy();
    });
  });

  it("shows an empty state message when the competition list is empty", async () => {
    (getCompetitions as jest.Mock).mockResolvedValueOnce([]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => {
      expect(screen.getByText(/no competitions/i)).toBeTruthy();
    });
  });
});
