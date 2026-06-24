import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Match } from "../types/competition";
import { gameStateLabel, showScore } from "../utils/gameState";
import { formatInTimeZone } from "../utils/time";

interface GameCardCompactProps {
  match: Match;
  deviceTimeZone: string;
}

function scoreText(match: Match): string {
  const home = match.score?.home;
  const away = match.score?.away;
  if (home === null && away === null) return "- - -";
  if (home === undefined || away === undefined) return "- - -";
  return `${home} - ${away}`;
}

export function GameCardCompact({ match, deviceTimeZone }: GameCardCompactProps) {
  const label = gameStateLabel(match.status);
  const kickOffDeviceTime = formatInTimeZone(match.utcDate, deviceTimeZone);

  return (
    <View style={styles.card}>
      <View style={styles.teams}>
        <Text style={styles.teamName} numberOfLines={1}>
          {match.homeTeam}
        </Text>
        <Text style={styles.vs}>vs</Text>
        <Text style={styles.teamName} numberOfLines={1}>
          {match.awayTeam}
        </Text>
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
    </View>
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
  teamName: {
    color: "#cccccc",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
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
