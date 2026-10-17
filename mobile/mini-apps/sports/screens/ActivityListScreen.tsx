import React, { useCallback } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { sportsApi } from "../api/sportsApi";
import { ActivityDTO } from "@app-types/api";
import { useTheme } from "@shared/hooks/useTheme";
import { SkeletonList } from "@shared/components/SkeletonLoader";
import { EmptyState } from "@shared/components/EmptyState";
import { RetryScreen } from "@shared/components/RetryScreen";
import { spacing, radius, typography } from "@shared/theme/tokens";

/**
 * Spec requirement: "Sports must contain a debug crash button" used to
 * exercise the MiniAppErrorBoundary / fault isolation without affecting
 * Care or Events, which live in their own boundaries.
 */
function CrashButton() {
  const [shouldCrash, setShouldCrash] = React.useState(false);
  if (shouldCrash) {
    throw new Error("Sports: manual crash triggered from debug button");
  }
  return (
    <Pressable
      onPress={() => setShouldCrash(true)}
      style={styles.crashButton}
      accessibilityLabel="debug-crash-sports"
    >
      <Text style={styles.crashButtonText}>Debug: Crash Sports</Text>
    </Pressable>
  );
}

export function ActivityListScreen() {
  const theme = useTheme();

  const { data, isLoading, isError, refetch } = useQuery<ActivityDTO[]>({
    queryKey: ["sports", "activities"],
    queryFn: sportsApi.listActivities,
  });

  const renderItem = useCallback(
    ({ item }: { item: ActivityDTO }) => (
      <Pressable
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => router.push({ pathname: "/sports/book", params: { activityId: item.id } })}
      >
        <Text style={[typography.h3, { color: theme.textPrimary }]}>{item.title}</Text>
        <Text style={[typography.body, { color: theme.textSecondary, marginTop: 4 }]}>
          {item.description}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[typography.caption, { color: theme.textSecondary }]}>
            {item.location}
          </Text>
          <Text style={[typography.caption, { color: theme.primary }]}>
            {item.durationMins} min
          </Text>
        </View>
      </Pressable>
    ),
    [theme]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[typography.h1, { color: theme.textPrimary }]}>Sports</Text>
        <CrashButton />
      </View>

      {isLoading ? (
        <View style={{ padding: spacing.md }}>
          <SkeletonList rows={5} />
        </View>
      ) : isError ? (
        <RetryScreen message="Couldn't load activities." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No activities yet" subtitle="Check back soon." />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  card: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  crashButton: {
    backgroundColor: "#E5484D",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  crashButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
});
