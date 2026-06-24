import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { CompetitionTile } from "../src/components/CompetitionTile";
import {
  ApiError,
  NetworkError,
  RateLimitError,
  getCompetitions,
} from "../src/services/competitionService";
import type { Competition } from "../src/types/competition";

type ScreenState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; competitions: Competition[] };

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

export default function CompetitionSelectScreen() {
  const router = useRouter();
  const [state, setState] = useState<ScreenState>({ status: "loading" });

  useEffect(() => {
    getCompetitions()
      .then((competitions) => {
        setState({ status: "success", competitions });
      })
      .catch((err: unknown) => {
        setState({ status: "error", message: errorMessage(err) });
      });
  }, []);

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

  if (state.competitions.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No competitions available.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {state.competitions.map((competition) => (
        <CompetitionTile
          key={competition.id}
          competition={competition}
          onPress={() => router.push(`/competition/${competition.code}`)}
        />
      ))}
    </ScrollView>
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
  emptyText: {
    color: "#aaaaaa",
    fontSize: 16,
    textAlign: "center",
  },
  scroll: {
    flex: 1,
    backgroundColor: "#0a0a1a",
  },
  content: {
    padding: 16,
  },
});
