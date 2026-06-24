import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { GameCardProps } from "../types/competition";
import { formatInTimeZone, getVenueTimeZone } from "../utils/time";

export function GameCard({ match, deviceTimeZone }: GameCardProps) {
  const venueTimeZone = getVenueTimeZone(match.venue.city, match.venue.country);
  const kickOffVenueTime = formatInTimeZone(match.utcDate, venueTimeZone);
  const kickOffDeviceTime = formatInTimeZone(match.utcDate, deviceTimeZone);

  return (
    <View style={styles.card}>
      <View style={styles.teams}>
        <Text style={styles.teamName}>{match.homeTeam}</Text>
        <Text style={styles.vs}>vs</Text>
        <Text style={styles.teamName}>{match.awayTeam}</Text>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.status}>{match.status}</Text>
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
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  teams: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  teamName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  vs: {
    color: "#888888",
    fontSize: 12,
    marginHorizontal: 8,
  },
  statusRow: {
    alignItems: "center",
    marginBottom: 12,
  },
  status: {
    color: "#f0a500",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  times: {
    backgroundColor: "#0f3460",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
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
    paddingTop: 8,
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
