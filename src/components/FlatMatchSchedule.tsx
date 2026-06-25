import React, { useRef } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

export function FlatMatchSchedule({
  matches,
  crests,
  matchEvents,
  deviceTimeZone,
}: FlatMatchScheduleProps) {
  // biome-ignore lint/suspicious/noExplicitAny: ScrollView ref type
  const scrollViewRef = useRef<any>(null);

  function handleNow() {
    if (matches.length === 0) return;
    const nowIndex = smartFocusIndex(matches);
    scrollViewRef.current?.scrollTo({
      y: nowIndex * CARD_HEIGHT + TOP_PADDING,
      animated: true,
    });
  }

  return (
    <View style={styles.screen}>
      <View testID="flat-top-bar" style={styles.topBar}>
        <TouchableOpacity testID="flat-now-button" style={styles.nowButton} onPress={handleNow}>
          <Text style={styles.nowButtonText}>Now</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
      >
        {matches.map((match) => (
          <GameCardFocused
            key={match.id}
            match={match}
            deviceTimeZone={deviceTimeZone}
            events={matchEvents[match.id]}
            homeCrest={crests[match.homeTeam]}
            awayCrest={crests[match.awayTeam]}
          />
        ))}
      </ScrollView>
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
