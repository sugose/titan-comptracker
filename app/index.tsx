import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
    return "Too many requests — please wait a moment and try again.";
  }
  if (err instanceof NetworkError) {
    return "Network error. Check your connection and try again.";
  }
  if (err instanceof ApiError) {
    return `Server error (${err.statusCode}). Please try again later.`;
  }
  return "An unexpected error occurred.";
}

function sortedWithFavourites(competitions: Competition[], favourites: Set<string>): Competition[] {
  const favs = competitions.filter((c) => favourites.has(c.code));
  const rest = competitions.filter((c) => !favourites.has(c.code));
  return [...favs, ...rest];
}

export default function CompetitionSelectScreen() {
  const router = useRouter();
  const [state, setState] = useState<ScreenState>({ status: "loading" });
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [filterActive, setFilterActive] = useState(false);

  useEffect(() => {
    getCompetitions()
      .then((competitions) => {
        setState({ status: "success", competitions });
      })
      .catch((err: unknown) => {
        setState({ status: "error", message: errorMessage(err) });
      });

    Promise.all([
      AsyncStorage.getItem("favouriteCompetitions"),
      AsyncStorage.getItem("favouritesFilterActive"),
    ])
      .then(([favJson, filterJson]) => {
        if (favJson) setFavourites(new Set(JSON.parse(favJson) as string[]));
        if (filterJson) setFilterActive(filterJson === "true");
      })
      .catch(() => {});
  }, []);

  const toggleFavourite = useCallback((code: string) => {
    setFavourites((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      AsyncStorage.setItem("favouriteCompetitions", JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const toggleFilter = useCallback(() => {
    setFilterActive((prev) => {
      const next = !prev;
      AsyncStorage.setItem("favouritesFilterActive", String(next)).catch(() => {});
      return next;
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

  const displayed = filterActive
    ? state.competitions.filter((c) => favourites.has(c.code))
    : sortedWithFavourites(state.competitions, favourites);

  return (
    <View style={styles.screen}>
      <View testID="favourites-bar" style={styles.topBar}>
        <TouchableOpacity
          testID="favourites-filter-button"
          style={[styles.filterButton, filterActive && styles.filterButtonActive]}
          onPress={toggleFilter}
        >
          <Text style={[styles.filterButtonText, filterActive && styles.filterButtonTextActive]}>
            Favourites
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {displayed.map((competition) => (
          <CompetitionTile
            key={competition.id}
            competition={competition}
            onPress={() =>
              router.push(
                `/competition/${competition.code}?isFavourite=${favourites.has(competition.code) ? "true" : "false"}`,
              )
            }
            isFavourite={favourites.has(competition.code)}
            onToggleFavourite={() => toggleFavourite(competition.code)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0a0a1a",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a3a",
  },
  filterButton: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#f0a500",
  },
  filterButtonActive: {
    backgroundColor: "#f0a500",
  },
  filterButtonText: {
    color: "#f0a500",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  filterButtonTextActive: {
    color: "#0a0a1a",
  },
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
