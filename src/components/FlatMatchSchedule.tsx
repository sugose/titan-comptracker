import React from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  runOnUI,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import type { Match, MatchEvent } from "../types/competition";
import { gameStateLabel } from "../utils/gameState";
import { GameCardFocused } from "./GameCardFocused";

const CARD_HEIGHT = 220;
const TOP_PADDING = 16;

export function smartFocusIndex(matches: Match[]): number {
  const ongoingIdx = matches.findIndex((m) => gameStateLabel(m.status) === "ONGOING");
  if (ongoingIdx !== -1) return ongoingIdx;
  const upcomingIdx = matches.findIndex((m) => gameStateLabel(m.status) === "UPCOMING");
  if (upcomingIdx !== -1) return upcomingIdx;
  return 0;
}

interface FlatMatchScheduleProps {
  matches: Match[];
  crests: Record<string, string>;
  matchEvents: Record<number, MatchEvent[] | null>;
  deviceTimeZone: string;
}

function MagnifiedCard({
  index,
  scrollY,
  screenH,
  children,
}: {
  index: number;
  scrollY: SharedValue<number>;
  screenH: SharedValue<number>;
  children: React.ReactNode;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const cardCentre = TOP_PADDING + index * CARD_HEIGHT + CARD_HEIGHT / 2;
    const distance = cardCentre - (scrollY.value + screenH.value / 2);
    const scale = interpolate(
      distance,
      [-screenH.value / 2, 0, screenH.value / 2],
      [0.85, 1.0, 0.85],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale }] };
  });
  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

export function FlatMatchSchedule({
  matches,
  crests,
  matchEvents,
  deviceTimeZone,
}: FlatMatchScheduleProps) {
  const animatedRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const screenH = useSharedValue(Dimensions.get("window").height);

  React.useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      screenH.value = window.height;
    });
    return () => sub.remove();
  }, [screenH]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const panGesture = Gesture.Pan().onBegin(() => {
    cancelAnimation(scrollY);
  });

  function handleNow() {
    if (matches.length === 0) return;
    const nowIndex = smartFocusIndex(matches);
    const targetY = nowIndex * CARD_HEIGHT + TOP_PADDING;
    const duration = Math.round((Math.abs(targetY - scrollY.value) / CARD_HEIGHT) * 300);
    runOnUI(() => {
      scrollY.value = withTiming(targetY, { duration, easing: Easing.linear });
      scrollTo(animatedRef, 0, targetY, true);
    })();
  }

  return (
    <View style={styles.screen}>
      <View testID="flat-top-bar" style={styles.topBar}>
        <TouchableOpacity testID="flat-now-button" style={styles.nowButton} onPress={handleNow}>
          <Text style={styles.nowButtonText}>Now</Text>
        </TouchableOpacity>
      </View>
      <GestureDetector gesture={panGesture}>
        <Animated.ScrollView
          ref={animatedRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
        >
          {matches.map((match, index) => (
            <MagnifiedCard key={match.id} index={index} scrollY={scrollY} screenH={screenH}>
              <GameCardFocused
                match={match}
                deviceTimeZone={deviceTimeZone}
                events={matchEvents[match.id]}
                homeCrest={crests[match.homeTeam]}
                awayCrest={crests[match.awayTeam]}
              />
            </MagnifiedCard>
          ))}
        </Animated.ScrollView>
      </GestureDetector>
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
  scroll: {
    flex: 1,
    backgroundColor: "#0a0a1a",
  },
  content: {
    paddingVertical: TOP_PADDING,
    paddingHorizontal: 16,
  },
});
