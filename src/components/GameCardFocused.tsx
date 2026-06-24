import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Match } from "../types/competition";
import { gameStateLabel, showScore } from "../utils/gameState";
import { formatInTimeZone, getVenueTimeZone } from "../utils/time";

interface GameCardFocusedProps {
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

export function GameCardFocused({ match, deviceTimeZone }: GameCardFocusedProps) {
  const label = gameStateLabel(match.status);
  const venueTimeZone = getVenueTimeZone(match.venue.city, match.venue.country);
  const kickOffVenueTime = formatInTimeZone(match.utcDate, venueTimeZone);
  const kickOffDeviceTime = formatInTimeZone(match.utcDate, deviceTimeZone);

  return (
    <View testID="focused-card" style={styles.card}>
      <View style={styles.teams}>
        <Text style={styles.teamName}>{match.homeTeam}</Text>
        <Text style={styles.vs}>vs</Text>
        <Text style={styles.teamName}>{match.awayTeam}</Text>
      </View>

      <View style={styles.badgeRow}>
        <Text style={styles.badge}>{label}</Text>
        {showScore(label) && (
          <Text testID="focused-score" style={styles.score}>
            {scoreText(match)}
          </Text>
        )}
      </View>

      <View style={styles.times}>
        <Text style={styles.timeLabel}>Venue time</Text>
        <Text style={styles.timeValue}>{kickOffVenueTime}</Text>
        <Text style={styles.timeLabel}>Your time</Text>
        <Text style={styles.timeValue}>{kickOffDeviceTime}</Text>
      </View>

      <View style={styles.venue}>
        <Text style={styles.venueName}>{match.venue.name}</Text>
        {(match.venue.city || match.venue.country) && (
          <Text style={styles.venueLocation}>
            {[match.venue.city, match.venue.country].filter(Boolean).join(", ")}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1a1a2e",
    borderRadius: 14,
    padding: 18,
    marginVertical: 6,
    marginHorizontal: 0,
    shadowColor: "#4466ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#334488",
    transform: [{ scale: 1.0 }],
  },
  teams: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  teamName: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  vs: {
    color: "#888888",
    fontSize: 12,
    marginHorizontal: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    gap: 12,
  },
  badge: {
    color: "#f0a500",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  score: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  times: {
    backgroundColor: "#0f3460",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  timeLabel: {
    color: "#aaaaaa",
    fontSize: 10,
    marginTop: 4,
  },
  timeValue: {
    color: "#ffffff",
    fontSize: 13,
  },
  venue: {
    borderTopWidth: 1,
    borderTopColor: "#333355",
    paddingTop: 10,
  },
  venueName: {
    color: "#cccccc",
    fontSize: 13,
    fontWeight: "500",
  },
  venueLocation: {
    color: "#888888",
    fontSize: 11,
    marginTop: 2,
  },
});
