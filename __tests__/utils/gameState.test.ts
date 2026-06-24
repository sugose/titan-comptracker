import { gameStateLabel, showScore } from "../../src/utils/gameState";

describe("gameStateLabel", () => {
  it("maps SCHEDULED to UPCOMING", () => {
    expect(gameStateLabel("SCHEDULED")).toBe("UPCOMING");
  });

  it("maps TIMED to UPCOMING", () => {
    expect(gameStateLabel("TIMED")).toBe("UPCOMING");
  });

  it("maps IN_PLAY to ONGOING", () => {
    expect(gameStateLabel("IN_PLAY")).toBe("ONGOING");
  });

  it("maps PAUSED to ONGOING", () => {
    expect(gameStateLabel("PAUSED")).toBe("ONGOING");
  });

  it("maps LIVE to ONGOING", () => {
    expect(gameStateLabel("LIVE")).toBe("ONGOING");
  });

  it("maps FINISHED to FINISHED", () => {
    expect(gameStateLabel("FINISHED")).toBe("FINISHED");
  });

  it("maps POSTPONED to POSTPONED", () => {
    expect(gameStateLabel("POSTPONED")).toBe("POSTPONED");
  });

  it("maps CANCELLED to CANCELLED", () => {
    expect(gameStateLabel("CANCELLED")).toBe("CANCELLED");
  });

  it("maps SUSPENDED to SUSPENDED", () => {
    expect(gameStateLabel("SUSPENDED")).toBe("SUSPENDED");
  });

  it("returns the raw value for unknown statuses", () => {
    expect(gameStateLabel("SOME_UNKNOWN_STATUS")).toBe("SOME_UNKNOWN_STATUS");
  });
});

describe("showScore", () => {
  it("returns true for ONGOING", () => {
    expect(showScore("ONGOING")).toBe(true);
  });

  it("returns true for FINISHED", () => {
    expect(showScore("FINISHED")).toBe(true);
  });

  it("returns false for UPCOMING", () => {
    expect(showScore("UPCOMING")).toBe(false);
  });

  it("returns false for any other label", () => {
    expect(showScore("POSTPONED")).toBe(false);
    expect(showScore("CANCELLED")).toBe(false);
    expect(showScore("SUSPENDED")).toBe(false);
  });
});
