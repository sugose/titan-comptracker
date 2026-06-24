import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";
import CompetitionSelectScreen from "../../app/index";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CompetitionSelectScreen", () => {
  it("renders the FIFA World Cup 2026 tile", () => {
    render(<CompetitionSelectScreen />);
    expect(screen.getByText("FIFA World Cup 2026")).toBeTruthy();
  });

  it("navigates to /competition/WC when the tile is tapped", () => {
    render(<CompetitionSelectScreen />);
    fireEvent.press(screen.getByText("FIFA World Cup 2026"));
    expect(mockPush).toHaveBeenCalledWith("/competition/WC");
  });
});
