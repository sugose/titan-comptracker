import { useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GameCardCompact } from "../../src/components/GameCardCompact";
import { GameCardFocused } from "../../src/components/GameCardFocused";
import {
  ApiError,
  NetworkError,
  RateLimitError,
  getMatches,
} from "../../src/services/footballDataService";
import { getMatchDetail } from "../../src/services/matchDetailService";
import type { Match, MatchEvent } from "../../src/types/competition";
import { gameStateLabel } from "../../src/utils/gameState";

// Approximate card heights used to estimate scroll position → focus index.
// These are intentional approximations — actual rendered heights vary by device,
// font scaling, and content length. A future PBI should replace this with
// onLayout-based measurement for pixel-accurate focus tracking.
const COMPACT_CARD_HEIGHT = 72;
const FOCUSED_CARD_HEIGHT = 200;

type ScreenState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; matches: Match[] };

function errorMessage(err: unknown): string {
  if (err instanceof RateLimitError) {
    return err.resetTimestamp
      ? `Rate limit reached. Try again after ${new Date(Number(err.resetTimestamp) * 1000).toLocaleTimeString()}.`
      : "Rate limit reached. Please wait before retrying.";
  }
  if (err instanceof NetworkError) {
    return "Network error. Check your connection and try again.";
  }
  if (err instanceof ApiError) {
    return `Server error (${err.statusCode}). Please try again later.`;
  }
  return "An unexpected error occurred.";
}

// Note: this function uses the current focusedIdx to estimate card heights during
// iteration, creating a brief circular dependency when focus transitions. The
// approximation is acceptable for smooth scrolling but may produce a one-frame
// lag on fast scrolls. Acceptable for this iteration.
// Return the index of the card whose centre is closest to the vertical midpoint of the viewport.
function focusedIndex(scrollY: number, matches: Match[], focusedIdx: number): number {
  const viewportHeight = Dimensions.get("window").height;
  const viewportMid = scrollY + viewportHeight / 2;

  let offset = 0;
  let bestIdx = 0;
  let bestDist = Number.POSITIVE_INFINITY;

  for (let i = 0; i < matches.length; i++) {
    const cardHeight = i === focusedIdx ? FOCUSED_CARD_HEIGHT : COMPACT_CARD_HEIGHT;
    const cardMid = offset + cardHeight / 2;
    const dist = Math.abs(cardMid - viewportMid);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
    offset += cardHeight + (i === focusedIdx ? 12 : 8);
  }
  return bestIdx;
}

export default function MatchScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<ScreenState>({ status: "loading" });
  const [currentFocus, setCurrentFocus] = useState(0);
  const [matchEvents, setMatchEvents] = useState<Record<number, MatchEvent[] | null>>({});
  const fetchedIds = useRef<Set<number>>(new Set());
  const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const scrollY = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    getMatches(id)
      .then((matches) => {
        const sorted = [...matches].sort((a, b) => a.utcDate.localeCompare(b.utcDate));
        const ongoingIdx = sorted.findIndex((m) => gameStateLabel(m.status) === "ONGOING");
        const upcomingIdx = sorted.findIndex((m) => gameStateLabel(m.status) === "UPCOMING");
        const initialFocus = ongoingIdx !== -1 ? ongoingIdx : upcomingIdx !== -1 ? upcomingIdx : 0;
        setCurrentFocus(initialFocus);
        setState({ status: "success", matches: sorted });

        // Scroll to centre the initially focused card after layout completes.
        const viewportHeight = Dimensions.get("window").height;
        let offsetBeforeFocused = 0;
        for (let i = 0; i < initialFocus; i++) {
          offsetBeforeFocused += COMPACT_CARD_HEIGHT + 8;
        }
        const scrollOffset = Math.max(
          0,
          offsetBeforeFocused + FOCUSED_CARD_HEIGHT / 2 - viewportHeight / 2,
        );
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: scrollOffset, animated: false });
        }, 100);
      })
      .catch((err: unknown) => {
        setState({ status: "error", message: errorMessage(err) });
      });
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

  function reloadEvents(matchId: number) {
    fetchedIds.current.delete(matchId);
    setMatchEvents((prev) => ({ ...prev, [matchId]: null }));
    getMatchDetail(matchId)
      .then((detail) => {
        setMatchEvents((prev) => ({ ...prev, [matchId]: detail.events }));
      })
      .catch(() => {
        setMatchEvents((prev) => ({ ...prev, [matchId]: [] }));
      });
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.current = event.nativeEvent.contentOffset.y;
    if (state.status !== "success") return;
    const next = focusedIndex(scrollY.current, state.matches, currentFocus);
    if (next !== currentFocus) setCurrentFocus(next);
  }

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

  return (
    // Vertical carousel — focused card centred on screen, compact cards peek above and below.
    <ScrollView
      ref={scrollViewRef}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={true}
    >
      {state.matches.map((match, index) =>
        index === currentFocus ? (
          <GameCardFocused
            key={match.id}
            match={match}
            deviceTimeZone={deviceTimeZone}
            events={matchEvents[match.id]}
            onReload={() => reloadEvents(match.id)}
          />
        ) : (
          <GameCardCompact key={match.id} match={match} deviceTimeZone={deviceTimeZone} />
        ),
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
