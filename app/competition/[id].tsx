import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { FlatMatchSchedule } from "../../src/components/FlatMatchSchedule";
import { GameCardCompact } from "../../src/components/GameCardCompact";
import { GameCardFocused } from "../../src/components/GameCardFocused";
import {
  ApiError,
  NetworkError,
  RateLimitError,
  getMatches,
} from "../../src/services/footballDataService";
import { getMatchDetail } from "../../src/services/matchDetailService";
import { getTeamCrests } from "../../src/services/teamService";
import type { Match, MatchEvent } from "../../src/types/competition";
import { gameStateLabel } from "../../src/utils/gameState";
import { type CardLayout, TOP_PADDING, computeScrollOffset } from "../../src/utils/scrollOffset";

type ScreenState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; matches: Match[] };

function errorMessage(err: unknown): string {
  if (err instanceof RateLimitError) {
    return "Too many requests — please wait a moment and try again.";
  }
  if (err instanceof NetworkError) {
    return "Network error. Check your connection and try again.";
  }
  if (err instanceof ApiError) {
    return `Server error (${err.statusCode}). Please try again later.`;
  }
  return "An unexpected error occurred.";
}

function smartFocusIndex(matches: Match[]): number {
  const ongoingIdx = matches.findIndex((m) => gameStateLabel(m.status) === "ONGOING");
  if (ongoingIdx !== -1) return ongoingIdx;
  const upcomingIdx = matches.findIndex((m) => gameStateLabel(m.status) === "UPCOMING");
  if (upcomingIdx !== -1) return upcomingIdx;
  return 0;
}

type CardWrapperProps = {
  scrollY: SharedValue<number>;
  screenH: SharedValue<number>;
  onMeasured: (y: number, height: number) => void;
  children: React.ReactNode;
};

function CardWrapper({ scrollY, screenH, onMeasured, children }: CardWrapperProps) {
  const cardY = useSharedValue(0);
  const cardH = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    if (cardH.value === 0) return {};
    const cardCenter = cardY.value + cardH.value / 2;
    const viewportCenter = scrollY.value + screenH.value / 2;
    const distance = cardCenter - viewportCenter;
    const scale = interpolate(
      distance,
      [-screenH.value / 2, 0, screenH.value / 2],
      [0.88, 1.0, 0.88],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale }] };
  });

  return (
    <Animated.View
      style={animatedStyle}
      onLayout={(e) => {
        const { y, height } = e.nativeEvent.layout;
        cardY.value = y + TOP_PADDING;
        cardH.value = height;
        onMeasured(y + TOP_PADDING, height);
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function MatchScheduleScreen() {
  const { id, isFavourite } = useLocalSearchParams<{ id: string; isFavourite?: string }>();
  const [state, setState] = useState<ScreenState>({ status: "loading" });
  const [currentFocus, setCurrentFocus] = useState(0);
  const [matchEvents, setMatchEvents] = useState<Record<number, MatchEvent[] | null>>({});
  const [crests, setCrests] = useState<Record<string, string>>({});
  const fetchedIds = useRef<Set<number>>(new Set());
  const snapEnabled = useRef(false);
  const nowScrollPendingRef = useRef(false);
  const cardLayouts = useRef<Record<number, CardLayout>>({});
  const matchCountRef = useRef(0);
  const currentFocusRef = useRef(0);
  currentFocusRef.current = currentFocus;
  const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // biome-ignore lint/suspicious/noExplicitAny: Reanimated ScrollView ref type not publicly exported
  const scrollViewRef = useRef<any>(null);
  const scrollY = useSharedValue(0);
  const screenH = useSharedValue(Dimensions.get("window").height);

  React.useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      screenH.value = window.height;
    });
    return () => sub.remove();
  }, [screenH]);

  const updateFocusFromScroll = useCallback((yValue: number) => {
    const layouts = cardLayouts.current;
    const count = matchCountRef.current;
    if (count === 0) return;
    const screenH = Dimensions.get("window").height;
    const viewportCenter = yValue + screenH / 2;
    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < count; i++) {
      const layout = layouts[i];
      if (!layout) continue;
      const cardCenter = layout.y + layout.height / 2;
      const dist = Math.abs(cardCenter - viewportCenter);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (bestIdx !== currentFocusRef.current) {
      setCurrentFocus(bestIdx);
    }
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      runOnJS(updateFocusFromScroll)(event.contentOffset.y);
    },
  });

  React.useEffect(() => {
    getMatches(id)
      .then((matches) => {
        const sorted = [...matches].sort((a, b) => a.utcDate.localeCompare(b.utcDate));
        const initialFocus = smartFocusIndex(sorted);
        matchCountRef.current = sorted.length;
        setCurrentFocus(initialFocus);
        setState({ status: "success", matches: sorted });

        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: computeScrollOffset(initialFocus, cardLayouts.current),
            animated: false,
          });
          snapEnabled.current = true;
        }, 100);
      })
      .catch((err: unknown) => {
        setState({ status: "error", message: errorMessage(err) });
      });

    getTeamCrests(id)
      .then((result) => setCrests(result))
      .catch(() => {});
  }, [id]);

  React.useEffect(() => {
    if (state.status !== "success") return;
    const match = state.matches[currentFocus];
    if (!match) return;
    const label = gameStateLabel(match.status);
    if (label !== "ONGOING" && label !== "FINISHED") return;
    if (fetchedIds.current.has(match.id)) return;
    fetchedIds.current.add(match.id);
    setMatchEvents((prev) => ({ ...prev, [match.id]: null }));
    getMatchDetail(match.id)
      .then((detail) => {
        setMatchEvents((prev) => ({ ...prev, [match.id]: detail.events }));
      })
      .catch(() => {
        setMatchEvents((prev) => ({ ...prev, [match.id]: [] }));
      });
  }, [currentFocus, state]);

  React.useEffect(() => {
    if (!snapEnabled.current) return;
    if (state.status !== "success") return;
    if (nowScrollPendingRef.current) return;
    scrollViewRef.current?.scrollTo({
      y: computeScrollOffset(currentFocus, cardLayouts.current),
      animated: true,
    });
  }, [currentFocus, state.status]);

  const handleNow = useCallback(() => {
    if (state.status !== "success") return;
    const nowIndex = smartFocusIndex(state.matches);
    if (cardLayouts.current[nowIndex]) {
      // Layout already measured — scroll immediately with real coordinates.
      scrollViewRef.current?.scrollTo({
        y: computeScrollOffset(nowIndex, cardLayouts.current),
        animated: true,
      });
    } else {
      // Layout not yet measured (card off-screen) — defer scroll to onMeasured.
      nowScrollPendingRef.current = true;
    }
    currentFocusRef.current = nowIndex;
    setCurrentFocus(nowIndex);
  }, [state]);

  if (state.status === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" testID="loading-indicator" />
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{state.message}</Text>
      </View>
    );
  }

  if (isFavourite === "true") {
    return (
      <FlatMatchSchedule
        matches={state.matches}
        crests={crests}
        matchEvents={matchEvents}
        deviceTimeZone={deviceTimeZone}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View testID="top-bar" style={styles.topBar}>
        <TouchableOpacity testID="now-button" style={styles.nowButton} onPress={handleNow}>
          <Text style={styles.nowButtonText}>Now</Text>
        </TouchableOpacity>
      </View>
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={true}
      >
        {state.matches.map((match, index) => (
          <CardWrapper
            key={match.id}
            scrollY={scrollY}
            screenH={screenH}
            onMeasured={(y, height) => {
              cardLayouts.current[index] = { y, height };
              if (nowScrollPendingRef.current && index === currentFocusRef.current) {
                nowScrollPendingRef.current = false;
                scrollViewRef.current?.scrollTo({
                  y: computeScrollOffset(index, cardLayouts.current),
                  animated: true,
                });
              }
            }}
          >
            {index === currentFocus ? (
              <GameCardFocused
                match={match}
                deviceTimeZone={deviceTimeZone}
                events={matchEvents[match.id]}
                homeCrest={crests[match.homeTeam]}
                awayCrest={crests[match.awayTeam]}
              />
            ) : (
              <GameCardCompact
                match={match}
                deviceTimeZone={deviceTimeZone}
                homeCrest={crests[match.homeTeam]}
                awayCrest={crests[match.awayTeam]}
                onPress={() => {
                  currentFocusRef.current = index;
                  setCurrentFocus(index);
                  scrollViewRef.current?.scrollTo({
                    y: computeScrollOffset(index, cardLayouts.current),
                    animated: true,
                  });
                }}
              />
            )}
          </CardWrapper>
        ))}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0a0a1a",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a3a",
  },
  nowButton: {
    backgroundColor: "#f0a500",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  nowButtonText: {
    color: "#0a0a1a",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0a1a",
    padding: 24,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 16,
    textAlign: "center",
  },
  scroll: {
    flex: 1,
    backgroundColor: "#0a0a1a",
  },
  content: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
});
