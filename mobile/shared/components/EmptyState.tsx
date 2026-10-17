import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../hooks/useTheme";
import { spacing, typography } from "../theme/tokens";

interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, typography.h3, { color: theme.textPrimary }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, typography.body, { color: theme.textSecondary }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  title: { textAlign: "center", marginBottom: spacing.xs },
  subtitle: { textAlign: "center" },
});
