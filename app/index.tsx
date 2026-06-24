import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function CompetitionSelectScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.tile}
        onPress={() => router.push("/competition/WC")}
        accessibilityRole="button"
      >
        <Text style={styles.tileText}>FIFA World Cup 2026</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0a1a",
    padding: 24,
  },
  tile: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333355",
  },
  tileText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
});
