import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { GameCard } from "../../src/components/GameCard";
import {
  ApiError,
  NetworkError,
  RateLimitError,
  getMatches,
} from "../../src/services/footballDataService";
import type { Match } from "../../src/types/competition";

type ScreenState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; matches: Match[] };

function errorMessage(err: unknown): string {
  if (err instanceof RateLimitError) {
    return err.resetTimestamp
      ? `Rate limit reached. Try again after ${new Date(Number(err.resetTimestamp) * 1000).toLocaleTimeString()}.`
      : "Rate limit reached. Please wait before retrying.";
  }
  if (err instanceof NetworkError) {
    return "Network error. Check your connection and try again.";
  }
  if (err instanceof ApiError) {
    return `Server error (${err.statusCode}). Please try again later.`;
  }
  return "An unexpected error occurred.";
}

export default function MatchScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<ScreenState>({ status: "loading" });
  const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    getMatches(id)
      .then((matches) => {
        const sorted = [...matches].sort((a, b) => a.utcDate.localeCompare(b.utcDate));
        setState({ status: "success", matches: sorted });
      })
      .catch((err: unknown) => {
        setState({ status: "error", message: errorMessage(err) });
      });
  }, [id]);

  if (state.status === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" testID="loading-indicator" />
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{state.message}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={state.matches}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <GameCard match={item} deviceTimeZone={deviceTimeZone} />}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0a1a",
    padding: 24,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 16,
    textAlign: "center",
  },
});
