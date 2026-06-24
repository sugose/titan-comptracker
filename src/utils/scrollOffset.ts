import { Dimensions } from "react-native";

export type CardLayout = { y: number; height: number };

export const TOP_PADDING = 16;

export function computeScrollOffset(focusIdx: number, layouts: Record<number, CardLayout>): number {
  const viewportH = Dimensions.get("window").height;

  const layout = layouts[focusIdx];
  if (layout) {
    return Math.max(0, layout.y + layout.height / 2 - viewportH / 2);
  }

  const measured = Object.values(layouts);
  if (measured.length === 0) return 0;

  const anchorIdx = Math.max(
    ...Object.keys(layouts)
      .map(Number)
      .filter((i) => i < focusIdx),
  );

  if (anchorIdx >= 0 && layouts[anchorIdx]) {
    const anchor = layouts[anchorIdx];
    const avgHeight = measured.reduce((sum, l) => sum + l.height, 0) / measured.length;
    const estimatedY = anchor.y + anchor.height + (focusIdx - anchorIdx - 1) * avgHeight;
    return Math.max(0, estimatedY + avgHeight / 2 - viewportH / 2);
  }

  const avgHeight = measured.reduce((sum, l) => sum + l.height, 0) / measured.length;
  return Math.max(0, focusIdx * avgHeight + avgHeight / 2 - viewportH / 2);
}
