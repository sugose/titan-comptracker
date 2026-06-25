import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Competition } from "../types/competition";

interface CompetitionTileProps {
  competition: Competition;
  onPress: () => void;
  isFavourite?: boolean;
  onToggleFavourite?: () => void;
}

function seasonYears(startDate: string, endDate: string): string {
  const startYear = startDate.slice(0, 4);
  const endYear = endDate.slice(0, 4);
  if (startYear === endYear) return startYear;
  return `${startYear} – ${endYear}`;
}

function seasonStatus(startDate: string, currentMatchday: number | null): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const diffMs = start.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    const formatted = start.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `Season starts ${formatted} · in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
  }
  if (diffDays === 0) {
    return "The season starts TODAY!";
  }
  if (currentMatchday !== null) {
    return `Matchday ${currentMatchday}`;
  }
  return "";
}

export function CompetitionTile({
  competition,
  onPress,
  isFavourite = false,
  onToggleFavourite,
}: CompetitionTileProps) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} accessibilityRole="button">
      <View style={styles.row}>
        <View style={styles.tileContent}>
          <Text style={styles.name}>{competition.name}</Text>
          <Text style={styles.area}>{competition.area}</Text>
          {competition.currentSeason && (
            <View>
              <Text style={styles.season}>
                {seasonYears(
                  competition.currentSeason.startDate,
                  competition.currentSeason.endDate,
                )}
              </Text>
              {(() => {
                const status = seasonStatus(
                  competition.currentSeason.startDate,
                  competition.currentSeason.currentMatchday,
                );
                return status ? <Text style={styles.matchday}>{status}</Text> : null;
              })()}
            </View>
          )}
        </View>
        <TouchableOpacity
          testID={`favourite-star-${competition.code}`}
          style={styles.starButton}
          onPress={onToggleFavourite}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={isFavourite ? styles.starFilled : styles.starOutline}>
            {isFavourite ? "★" : "☆"}
          </Text>
        </TouchableOpacity>
      </View>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  tileContent: {
    flex: 1,
  },
  starButton: {
    paddingLeft: 12,
  },
  starFilled: {
    fontSize: 22,
    color: "#f0a500",
  },
  starOutline: {
    fontSize: 22,
    color: "#888888",
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
