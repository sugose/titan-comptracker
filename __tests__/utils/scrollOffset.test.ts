import { Dimensions } from "react-native";
import type { CardLayout } from "../../src/utils/scrollOffset";
import {
  FALLBACK_CARD_HEIGHT,
  TOP_PADDING,
  computeScrollOffset,
} from "../../src/utils/scrollOffset";

beforeEach(() => {
  jest
    .spyOn(Dimensions, "get")
    .mockReturnValue({ height: 800, width: 390, scale: 1, fontScale: 1 });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("computeScrollOffset", () => {
  it("returns exact offset when target layout is measured", () => {
    const layouts: Record<number, CardLayout> = { 2: { y: 600, height: 200 } };
    // card centre = 600 + 100 = 700; viewportH/2 = 400; offset = 700 - 400 = 300
    expect(computeScrollOffset(2, layouts)).toBe(300);
  });

  it("returns 0 for index 0 when no layouts measured at all", () => {
    // (0 - 1) * FALLBACK + TOP_PADDING = negative → clamped to 0
    expect(computeScrollOffset(0, {})).toBe(0);
  });

  it("returns a positive estimate for index > 1 when no layouts measured at all", () => {
    // (5 - 1) * FALLBACK_CARD_HEIGHT + TOP_PADDING = 4 * 88 + 16 = 368
    expect(computeScrollOffset(5, {})).toBe(4 * FALLBACK_CARD_HEIGHT + TOP_PADDING);
  });

  it("does NOT return 0 when target layout is unmeasured but others are", () => {
    const layouts: Record<number, CardLayout> = {
      0: { y: TOP_PADDING, height: 80 },
      1: { y: TOP_PADDING + 88, height: 80 },
      2: { y: TOP_PADDING + 176, height: 80 },
    };
    const result = computeScrollOffset(10, layouts);
    expect(result).toBeGreaterThan(0);
  });

  it("uses anchor card below target index to estimate position", () => {
    const layouts: Record<number, CardLayout> = {
      0: { y: 16, height: 80 },
      1: { y: 104, height: 80 },
    };
    // anchorIdx = 1, anchor = { y: 104, height: 80 }
    // avgHeight = 80
    // estimatedY = 104 + 80 + (5 - 1 - 1) * 80 = 184 + 240 = 424
    // offset = max(0, 424 + 40 - 400) = 64
    expect(computeScrollOffset(5, layouts)).toBe(64);
  });

  it("clamps to 0 when estimated offset would be negative", () => {
    const layouts: Record<number, CardLayout> = { 0: { y: 16, height: 80 } };
    // card centre = 16 + 40 = 56; viewportH/2 = 400; 56 - 400 = -344 → 0
    expect(computeScrollOffset(0, layouts)).toBe(0);
  });
});
