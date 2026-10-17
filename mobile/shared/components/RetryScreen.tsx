import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../hooks/useTheme";
import { radius, spacing, typography } from "../theme/tokens";

interface RetryScreenProps {
  message?: string;
  onRetry: () => void;
}

export function RetryScreen({ message = "Something went wrong.", onRetry }: RetryScreenProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: spacing.sm }]}>
        Unable to load
      </Text>
      <Text
        style={[
          typography.body,
          { color: theme.textSecondary, textAlign: "center", marginBottom: spacing.lg },
        ]}
      >
        {message}
      </Text>
      <Pressable
        onPress={onRetry}
        style={[styles.button, { backgroundColor: theme.primary }]}
      >
        <Text style={[typography.body, { color: theme.primaryText, fontWeight: "600" }]}>
          Retry
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
});
