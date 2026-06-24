import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Competition } from "../types/competition";

interface CompetitionTileProps {
  competition: Competition;
  onPress: () => void;
}

function seasonYears(startDate: string, endDate: string): string {
  return `${startDate.slice(0, 4)} – ${endDate.slice(0, 4)}`;
}

export function CompetitionTile({ competition, onPress }: CompetitionTileProps) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} accessibilityRole="button">
      <Text style={styles.name}>{competition.name}</Text>
      <Text style={styles.area}>{competition.area}</Text>
      {competition.currentSeason && (
        <View>
          <Text style={styles.season}>
            {seasonYears(competition.currentSeason.startDate, competition.currentSeason.endDate)}
          </Text>
          {competition.currentSeason.currentMatchday !== null && (
            <Text style={styles.matchday}>
              Matchday {competition.currentSeason.currentMatchday}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "#333355",
  },
  name: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  area: {
    color: "#aaaaaa",
    fontSize: 13,
    marginBottom: 2,
  },
  season: {
    color: "#888888",
    fontSize: 12,
    marginTop: 2,
  },
  matchday: {
    color: "#f0a500",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
});
