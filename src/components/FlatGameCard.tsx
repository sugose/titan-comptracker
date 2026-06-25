import { Image } from "expo-image";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Match } from "../types/competition";
import { gameStateLabel, showScore } from "../utils/gameState";
import { formatInTimeZone } from "../utils/time";

const CREST_SIZE = Math.round(17 * 1.2);

interface FlatGameCardProps {
  match: Match;
  deviceTimeZone: string;
  homeCrest?: string;
  awayCrest?: string;
  favouriteTeams?: Set<string>;
}

function scoreText(match: Match): string {
  const home = match.score?.home;
  const away = match.score?.away;
  if (home === null && away === null) return "- - -";
  if (home === undefined || away === undefined) return "- - -";
  return `${home} - ${away}`;
}

export function FlatGameCard({
  match,
  deviceTimeZone,
  homeCrest,
  awayCrest,
  favouriteTeams,
}: FlatGameCardProps) {
  const label = gameStateLabel(match.status);
  const kickOffDeviceTime = formatInTimeZone(match.utcDate, deviceTimeZone);
  const abbreviatedTz = useMemo(() => {
    try {
      const parts = Intl.DateTimeFormat(undefined, {
        timeZone: deviceTimeZone,
        timeZoneName: "short",
      }).formatToParts(new Date(match.utcDate));
      return parts.find((p) => p.type === "timeZoneName")?.value ?? deviceTimeZone;
    } catch {
      return deviceTimeZone;
    }
  }, [deviceTimeZone, match.utcDate]);

  return (
    <View testID="flat-card" style={styles.card}>
      <View style={styles.teams}>
        <View style={styles.teamSide}>
          {homeCrest && (
            <Image
              testID="home-crest"
              source={{ uri: homeCrest }}
              style={styles.crest}
              contentFit="contain"
            />
          )}
          {favouriteTeams?.has(match.homeTeam) && (
            <Text testID={`favourite-star-home-${match.id}`} style={styles.teamStar}>
              ★
            </Text>
          )}
          <Text style={styles.teamName}>{match.homeTeam}</Text>
        </View>
        <Text style={styles.vs}>vs</Text>
        <View style={[styles.teamSide, styles.teamSideAway]}>
          {favouriteTeams?.has(match.awayTeam) && (
            <Text testID={`favourite-star-away-${match.id}`} style={styles.teamStar}>
              ★
            </Text>
          )}
          <Text style={styles.teamName}>{match.awayTeam}</Text>
          {awayCrest && (
            <Image
              testID="away-crest"
              source={{ uri: awayCrest }}
              style={styles.crest}
              contentFit="contain"
            />
          )}
        </View>
      </View>

      <View style={styles.badgeRow}>
        <Text style={styles.badge}>{label}</Text>
        {showScore(label) && (
          <Text testID="flat-card-score" style={styles.score}>
            {scoreText(match)}
          </Text>
        )}
      </View>

      <View style={styles.times}>
        <Text testID="flat-card-time" style={styles.timeValue}>
          {kickOffDeviceTime} <Text style={styles.tzAbbr}>{abbreviatedTz}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1a1a2e",
    borderRadius: 14,
    padding: 14,
    marginVertical: 0,
    marginHorizontal: 0,
    shadowColor: "#4466ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#334488",
  },
  teams: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
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
    marginHorizontal: 4,
  },
  teamName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  vs: {
    color: "#888888",
    fontSize: 11,
    marginHorizontal: 8,
  },
  teamStar: {
    fontSize: 13,
    color: "#f0a500",
    marginRight: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    gap: 12,
  },
  badge: {
    color: "#f0a500",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  score: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  times: {
    backgroundColor: "#0f3460",
    borderRadius: 8,
    padding: 8,
  },
  timeValue: {
    color: "#ffffff",
    fontSize: 12,
  },
  tzAbbr: {
    color: "#aaaaaa",
    fontSize: 11,
  },
});
