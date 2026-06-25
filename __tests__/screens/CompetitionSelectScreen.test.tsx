import AsyncStorage from "@react-native-async-storage/async-storage";
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

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock("../../src/components/CompetitionTile", () => ({
  CompetitionTile: ({
    competition,
    onPress,
    isFavourite,
    onToggleFavourite,
  }: {
    competition: Competition;
    onPress: () => void;
    isFavourite?: boolean;
    onToggleFavourite?: () => void;
  }) => {
    const { TouchableOpacity, Text, View } = require("react-native");
    return (
      <View>
        <TouchableOpacity testID={`tile-${competition.code}`} onPress={onPress}>
          <Text>{competition.name}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`favourite-star-${competition.code}`} onPress={onToggleFavourite}>
          <Text>{isFavourite ? "★" : "☆"}</Text>
        </TouchableOpacity>
      </View>
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

// Also active (same group as WC), ends later — used to test same-group fav sort
const CL: Competition = {
  id: 2001,
  code: "CL",
  name: "UEFA Champions League",
  area: "Europe",
  currentSeason: { startDate: "2026-06-01", endDate: "2026-07-31", currentMatchday: null },
};

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
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
    expect(mockPush).toHaveBeenCalledWith("/competition/WC?isFavourite=false");
  });

  it("navigates to /competition/PL when the PL tile is tapped", async () => {
    (getCompetitions as jest.Mock).mockResolvedValueOnce([PL]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => screen.getByTestId("tile-PL"));
    fireEvent.press(screen.getByTestId("tile-PL"));
    expect(mockPush).toHaveBeenCalledWith("/competition/PL?isFavourite=false");
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

describe("Star / favourites feature", () => {
  it("renders a favourite star for each competition tile", async () => {
    (getCompetitions as jest.Mock).mockResolvedValueOnce([WC, PL]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("favourite-star-WC")).toBeTruthy();
      expect(screen.getByTestId("favourite-star-PL")).toBeTruthy();
    });
  });

  it("stars start as outline when no favourites are stored", async () => {
    (getCompetitions as jest.Mock).mockResolvedValueOnce([WC, PL]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => screen.getByTestId("favourite-star-WC"));
    const stars = screen.getAllByText("☆");
    expect(stars).toHaveLength(2);
  });

  it("tapping the star marks the competition as favourite (filled star)", async () => {
    (getCompetitions as jest.Mock).mockResolvedValueOnce([WC]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => screen.getByTestId("favourite-star-WC"));
    fireEvent.press(screen.getByTestId("favourite-star-WC"));
    await waitFor(() => expect(screen.getByText("★")).toBeTruthy());
  });

  it("tapping the star again unmarks the competition (outline star returns)", async () => {
    (getCompetitions as jest.Mock).mockResolvedValueOnce([WC]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => screen.getByTestId("favourite-star-WC"));
    fireEvent.press(screen.getByTestId("favourite-star-WC"));
    await waitFor(() => screen.getByText("★"));
    fireEvent.press(screen.getByTestId("favourite-star-WC"));
    await waitFor(() => expect(screen.queryByText("★")).toBeNull());
  });

  it("favourited competitions sort to the top within the same group", async () => {
    // WC and CL are both active; CL ends later so without favourites WC (ending sooner) is first.
    // Favouriting CL should push it to the top within the active group.
    (getCompetitions as jest.Mock).mockResolvedValueOnce([WC, CL]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => screen.getByTestId("favourite-star-CL"));
    fireEvent.press(screen.getByTestId("favourite-star-CL"));
    await waitFor(() => {
      const tiles = screen.getAllByTestId(/^tile-/);
      expect(tiles[0].props.testID).toBe("tile-CL");
      expect(tiles[1].props.testID).toBe("tile-WC");
    });
  });

  it("renders the favourites bar", async () => {
    (getCompetitions as jest.Mock).mockResolvedValueOnce([WC]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => expect(screen.getByTestId("favourites-bar")).toBeTruthy());
  });

  it("renders the favourites filter button", async () => {
    (getCompetitions as jest.Mock).mockResolvedValueOnce([WC]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => expect(screen.getByTestId("favourites-filter-button")).toBeTruthy());
  });

  it("filter button starts inactive — all competitions shown", async () => {
    (getCompetitions as jest.Mock).mockResolvedValueOnce([WC, PL]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("tile-WC")).toBeTruthy();
      expect(screen.getByTestId("tile-PL")).toBeTruthy();
    });
  });

  it("activating filter shows only favourited competitions", async () => {
    (getCompetitions as jest.Mock).mockResolvedValueOnce([WC, PL]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => screen.getByTestId("favourite-star-WC"));
    fireEvent.press(screen.getByTestId("favourite-star-WC"));
    await waitFor(() => screen.getByText("★"));
    fireEvent.press(screen.getByTestId("favourites-filter-button"));
    await waitFor(() => {
      expect(screen.getByTestId("tile-WC")).toBeTruthy();
      expect(screen.queryByTestId("tile-PL")).toBeNull();
    });
  });

  it("when filter is active with no favourites, list is empty", async () => {
    (getCompetitions as jest.Mock).mockResolvedValueOnce([WC, PL]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => screen.getByTestId("favourites-filter-button"));
    fireEvent.press(screen.getByTestId("favourites-filter-button"));
    await waitFor(() => {
      expect(screen.queryByTestId("tile-WC")).toBeNull();
      expect(screen.queryByTestId("tile-PL")).toBeNull();
    });
  });

  it("deactivating filter restores all competitions", async () => {
    (getCompetitions as jest.Mock).mockResolvedValueOnce([WC, PL]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => screen.getByTestId("favourites-filter-button"));
    fireEvent.press(screen.getByTestId("favourites-filter-button"));
    await waitFor(() => expect(screen.queryByTestId("tile-WC")).toBeNull());
    fireEvent.press(screen.getByTestId("favourites-filter-button"));
    await waitFor(() => {
      expect(screen.getByTestId("tile-WC")).toBeTruthy();
      expect(screen.getByTestId("tile-PL")).toBeTruthy();
    });
  });

  it("saves favourites to AsyncStorage when star is tapped", async () => {
    (getCompetitions as jest.Mock).mockResolvedValueOnce([WC]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => screen.getByTestId("favourite-star-WC"));
    fireEvent.press(screen.getByTestId("favourite-star-WC"));
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "favouriteCompetitions",
        JSON.stringify(["WC"]),
      );
    });
  });

  it("saves filter state to AsyncStorage when Favourites button is tapped", async () => {
    (getCompetitions as jest.Mock).mockResolvedValueOnce([WC]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => screen.getByTestId("favourites-filter-button"));
    fireEvent.press(screen.getByTestId("favourites-filter-button"));
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith("favouritesFilterActive", "true");
    });
  });

  it("loads favourites from AsyncStorage on mount", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "favouriteCompetitions") return Promise.resolve(JSON.stringify(["WC"]));
      return Promise.resolve(null);
    });
    (getCompetitions as jest.Mock).mockResolvedValueOnce([WC, PL]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => {
      expect(screen.getAllByText("★")).toHaveLength(1);
      expect(screen.getAllByText("☆")).toHaveLength(1);
    });
  });

  it("loads filter state from AsyncStorage on mount", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "favouriteCompetitions") return Promise.resolve(JSON.stringify(["WC"]));
      if (key === "favouritesFilterActive") return Promise.resolve("true");
      return Promise.resolve(null);
    });
    (getCompetitions as jest.Mock).mockResolvedValueOnce([WC, PL]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("tile-WC")).toBeTruthy();
      expect(screen.queryByTestId("tile-PL")).toBeNull();
    });
  });

  it("defaults to empty favourites and filter inactive when AsyncStorage read fails", async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error("storage error"));
    (getCompetitions as jest.Mock).mockResolvedValueOnce([WC, PL]);
    render(<CompetitionSelectScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("tile-WC")).toBeTruthy();
      expect(screen.getByTestId("tile-PL")).toBeTruthy();
    });
    const stars = screen.getAllByText("☆");
    expect(stars).toHaveLength(2);
  });
});
