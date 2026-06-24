import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Match } from "../types/competition";
import { gameStateLabel, showScore } from "../utils/gameState";
import { formatInTimeZone } from "../utils/time";

const CREST_SIZE = Math.round(13 * 1.2);

interface GameCardCompactProps {
  match: Match;
  deviceTimeZone: string;
  homeCrest?: string;
  awayCrest?: string;
  onPress?: () => void;
}

function scoreText(match: Match): string {
  const home = match.score?.home;
  const away = match.score?.away;
  if (home === null && away === null) return "- - -";
  if (home === undefined || away === undefined) return "- - -";
  return `${home} - ${away}`;
}

export function GameCardCompact({
  match,
  deviceTimeZone,
  homeCrest,
  awayCrest,
  onPress,
}: GameCardCompactProps) {
  const label = gameStateLabel(match.status);
  const kickOffDeviceTime = formatInTimeZone(match.utcDate, deviceTimeZone);

  return (
    <TouchableOpacity testID="compact-card" style={styles.card} onPress={onPress}>
      <View style={styles.teams}>
        <View style={styles.teamSide}>
          {homeCrest && (
            <Image
              testID="home-crest"
              source={{ uri: homeCrest }}
              style={styles.crest}
              resizeMode="contain"
            />
          )}
          <Text style={styles.teamName} numberOfLines={1}>
            {match.homeTeam}
          </Text>
        </View>
        <Text style={styles.vs}>vs</Text>
        <View style={[styles.teamSide, styles.teamSideAway]}>
          <Text style={styles.teamName} numberOfLines={1}>
            {match.awayTeam}
          </Text>
          {awayCrest && (
            <Image
              testID="away-crest"
              source={{ uri: awayCrest }}
              style={styles.crest}
              resizeMode="contain"
            />
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.time}>{kickOffDeviceTime}</Text>
        <Text style={styles.badge}>{label}</Text>
        {showScore(label) && (
          <Text testID="compact-score" style={styles.score}>
            {scoreText(match)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#12122a",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 4,
    marginHorizontal: 24,
  },
  teams: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  teamSide: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  teamSideAway: {
    justifyContent: "center",
  },
  crest: {
    width: CREST_SIZE,
    height: CREST_SIZE,
    marginHorizontal: 3,
  },
  teamName: {
    color: "#cccccc",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  vs: {
    color: "#666666",
    fontSize: 10,
    marginHorizontal: 6,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  time: {
    color: "#aaaaaa",
    fontSize: 11,
    flex: 1,
  },
  badge: {
    color: "#f0a500",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginLeft: 8,
  },
  score: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 8,
  },
});
