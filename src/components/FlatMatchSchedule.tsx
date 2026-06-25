import AsyncStorage from "@react-native-async-storage/async-storage";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  runOnJS,
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

type StateFilter = "All" | "Soon" | "Live" | "Played";
const STATE_FILTER_CYCLE: StateFilter[] = ["All", "Soon", "Live", "Played"];

export function smartFocusIndex(matches: Match[]): number {
  const ongoingIdx = matches.findIndex((m) => gameStateLabel(m.status) === "ONGOING");
  if (ongoingIdx !== -1) return ongoingIdx;
  const upcomingIdx = matches.findIndex((m) => gameStateLabel(m.status) === "UPCOMING");
  if (upcomingIdx !== -1) return upcomingIdx;
  return 0;
}

function matchesStateFilter(match: Match, filter: StateFilter): boolean {
  if (filter === "All") return true;
  const label = gameStateLabel(match.status);
  if (filter === "Soon") return label === "UPCOMING";
  if (filter === "Live") return label === "ONGOING";
  if (filter === "Played") return label === "FINISHED";
  return true;
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
  children: ReactNode;
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

  const [favouriteTeams, setFavouriteTeams] = useState<Set<string>>(new Set());
  const [filterActive, setFilterActive] = useState(false);
  const [foldOutOpen, setFoldOutOpen] = useState(false);
  const [stateFilter, setStateFilter] = useState<StateFilter>("All");
  const foldOutOpenedAtRef = useRef<number>(0);
  const foldOutOpenRef = useRef(false);

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      screenH.value = window.height;
    });
    return () => sub.remove();
  }, [screenH]);

  useEffect(() => {
    AsyncStorage.getItem("favouriteTeams")
      .then((json) => {
        if (json) setFavouriteTeams(new Set(JSON.parse(json) as string[]));
      })
      .catch(() => {});
  }, []);

  function closeFoldOutIfStale() {
    if (foldOutOpenRef.current && Date.now() - foldOutOpenedAtRef.current > 500) {
      foldOutOpenRef.current = false;
      setFoldOutOpen(false);
    }
  }

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
    onBeginDrag: () => {
      cancelAnimation(scrollY);
      runOnJS(closeFoldOutIfStale)();
    },
  });

  const uniqueTeams = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const match of matches) {
      if (match.homeTeam && !seen.has(match.homeTeam)) {
        seen.add(match.homeTeam);
        names.push(match.homeTeam);
      }
      if (match.awayTeam && !seen.has(match.awayTeam)) {
        seen.add(match.awayTeam);
        names.push(match.awayTeam);
      }
    }
    return names.sort((a, b) => a.localeCompare(b));
  }, [matches]);

  const displayedMatches = useMemo(() => {
    return matches.filter((m) => {
      const passesState = matchesStateFilter(m, stateFilter);
      const passesFavourites =
        !filterActive || favouriteTeams.has(m.homeTeam) || favouriteTeams.has(m.awayTeam);
      return passesState && passesFavourites;
    });
  }, [matches, stateFilter, filterActive, favouriteTeams]);

  const toggleTeamFavourite = useCallback((teamName: string) => {
    setFavouriteTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamName)) {
        next.delete(teamName);
      } else {
        next.add(teamName);
      }
      AsyncStorage.setItem("favouriteTeams", JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  function handleFavouritesButton() {
    if (filterActive) {
      setFilterActive(false);
      setFoldOutOpen(false);
      foldOutOpenRef.current = false;
    } else {
      setFilterActive(true);
      setFoldOutOpen(true);
      foldOutOpenRef.current = true;
      foldOutOpenedAtRef.current = Date.now();
    }
  }

  function handleStateFilter() {
    setStateFilter((prev) => {
      const idx = STATE_FILTER_CYCLE.indexOf(prev);
      return STATE_FILTER_CYCLE[(idx + 1) % STATE_FILTER_CYCLE.length];
    });
  }

  function handleNow() {
    if (displayedMatches.length === 0) return;
    const nowIndex = smartFocusIndex(displayedMatches);
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
        <TouchableOpacity
          testID="flat-favourites-button"
          style={[styles.pill, filterActive && styles.pillActive]}
          onPress={handleFavouritesButton}
        >
          <Text style={[styles.pillText, filterActive && styles.pillTextActive]}>Favourites</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="flat-state-filter-button"
          style={styles.pillActive}
          onPress={handleStateFilter}
        >
          <Text style={styles.pillTextActive}>{stateFilter}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="flat-now-button" style={styles.pillActive} onPress={handleNow}>
          <Text style={styles.pillTextActive}>Now</Text>
        </TouchableOpacity>
      </View>

      {foldOutOpen && (
        <View testID="flat-favourites-foldout" style={styles.foldOut}>
          <ScrollView style={styles.foldOutScroll}>
            {uniqueTeams.map((teamName) => (
              <TouchableOpacity
                key={teamName}
                testID={`favourite-team-row-${teamName}`}
                style={styles.teamRow}
                onPress={() => toggleTeamFavourite(teamName)}
              >
                <Text
                  testID={`favourite-team-checkbox-${teamName}`}
                  style={favouriteTeams.has(teamName) ? styles.checkboxChecked : styles.checkbox}
                >
                  {favouriteTeams.has(teamName) ? "☑" : "☐"}
                </Text>
                <Text style={styles.teamRowName}>{teamName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Animated.ScrollView
        ref={animatedRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={true}
      >
        {displayedMatches.map((match, index) => (
          <MagnifiedCard key={match.id} index={index} scrollY={scrollY} screenH={screenH}>
            <GameCardFocused
              match={match}
              deviceTimeZone={deviceTimeZone}
              events={matchEvents[match.id]}
              homeCrest={crests[match.homeTeam]}
              awayCrest={crests[match.awayTeam]}
              favouriteTeams={favouriteTeams}
            />
          </MagnifiedCard>
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
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a3a",
  },
  pill: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#f0a500",
  },
  pillActive: {
    backgroundColor: "#f0a500",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  pillText: {
    color: "#f0a500",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  pillTextActive: {
    color: "#0a0a1a",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  foldOut: {
    maxHeight: 240,
    backgroundColor: "#1a1a2e",
    borderBottomWidth: 1,
    borderBottomColor: "#333355",
  },
  foldOutScroll: {
    flex: 1,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  checkbox: {
    fontSize: 18,
    color: "#888888",
    marginRight: 10,
  },
  checkboxChecked: {
    fontSize: 18,
    color: "#f0a500",
    marginRight: 10,
  },
  teamRowName: {
    color: "#ffffff",
    fontSize: 15,
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
