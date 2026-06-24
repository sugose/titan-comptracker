import { Image } from "expo-image";
import React from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { Match, MatchEvent } from "../types/competition";
import { gameStateLabel, showScore } from "../utils/gameState";
import { formatInTimeZone } from "../utils/time";

const CREST_SIZE = Math.round(17 * 1.2);

interface GameCardFocusedProps {
  match: Match;
  deviceTimeZone: string;
  events?: MatchEvent[] | null;
  onReload?: () => void;
  homeCrest?: string;
  awayCrest?: string;
  scaleValue?: Animated.Value;
}

function scoreText(match: Match): string {
  const home = match.score?.home;
  const away = match.score?.away;
  if (home === null && away === null) return "- - -";
  if (home === undefined || away === undefined) return "- - -";
  return `${home} - ${away}`;
}

function eventDescription(event: MatchEvent): string {
  if (event.type === "GOAL") return `⚽ ${event.scorer}`;
  if (event.type === "BOOKING") {
    const icon = event.card === "YELLOW_CARD" ? "🟨" : "🟥";
    return `${icon} ${event.player}`;
  }
  return `↓ ${event.playerOut} / ↑ ${event.playerIn}`;
}

function EventRow({ event }: { event: MatchEvent }) {
  const desc = eventDescription(event);
  const minute = `${event.minute}'`;
  const isHome = event.team === "HOME";

  return (
    <View style={eventStyles.row}>
      <Text style={eventStyles.homeSide}>{isHome ? `${minute} ${desc}` : ""}</Text>
      <Text style={eventStyles.awaySide}>{!isHome ? `${desc} ${minute}` : ""}</Text>
    </View>
  );
}

export function GameCardFocused({
  match,
  deviceTimeZone,
  events,
  onReload,
  homeCrest,
  awayCrest,
  scaleValue,
}: GameCardFocusedProps) {
  const label = gameStateLabel(match.status);
  const kickOffDeviceTime = formatInTimeZone(match.utcDate, deviceTimeZone);
  const showReload = events !== undefined;

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue ?? 1.0 }] }}>
      <View testID="focused-card" style={styles.card}>
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
            <Text style={styles.teamName}>{match.homeTeam}</Text>
          </View>
          <Text style={styles.vs}>vs</Text>
          <View style={[styles.teamSide, styles.teamSideAway]}>
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

        {showReload && (
          <TouchableOpacity
            testID="reload-button"
            onPress={onReload}
            style={styles.reloadButton}
            accessibilityLabel="Reload events"
          >
            <Text style={styles.reloadIcon}>🔄</Text>
          </TouchableOpacity>
        )}

        <View style={styles.badgeRow}>
          <Text style={styles.badge}>{label}</Text>
          {showScore(label) && (
            <Text testID="focused-score" style={styles.score}>
              {scoreText(match)}
            </Text>
          )}
        </View>

        <View style={styles.times}>
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

        {events === null && (
          <ActivityIndicator
            testID="events-loading"
            size="small"
            color="#f0a500"
            style={styles.eventsLoading}
          />
        )}

        {Array.isArray(events) && events.length > 0 && (
          <View testID="events-list" style={styles.eventsList}>
            {events.map((event, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: events are ordered and stable
              <EventRow key={i} event={event} />
            ))}
          </View>
        )}
      </View>
    </Animated.View>
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
  },
  teams: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
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
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  vs: {
    color: "#888888",
    fontSize: 12,
    marginHorizontal: 8,
  },
  reloadButton: {
    position: "absolute",
    top: 10,
    right: 12,
  },
  reloadIcon: {
    fontSize: 16,
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
  eventsLoading: {
    marginTop: 12,
  },
  eventsList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#333355",
    paddingTop: 8,
  },
});

const eventStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  homeSide: {
    color: "#dddddd",
    fontSize: 12,
    flex: 1,
  },
  awaySide: {
    color: "#dddddd",
    fontSize: 12,
    flex: 1,
    textAlign: "right",
  },
});
