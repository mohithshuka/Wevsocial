import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { eventsApi } from "../api/eventsApi";
import { useTheme } from "@shared/hooks/useTheme";
import { SkeletonList } from "@shared/components/SkeletonLoader";
import { EmptyState } from "@shared/components/EmptyState";
import { RetryScreen } from "@shared/components/RetryScreen";
import { spacing, radius, typography } from "@shared/theme/tokens";

/** Events is intentionally a minimal stub per spec: registered in the
 * kernel, mountable, and it loads correctly — no booking flow. */
export function EventsScreen() {
  const theme = useTheme();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["events"],
    queryFn: eventsApi.listEvents,
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[typography.h1, { color: theme.textPrimary, padding: spacing.md }]}>
        Events
      </Text>

      {isLoading ? (
        <View style={{ paddingHorizontal: spacing.md }}>
          <SkeletonList rows={2} />
        </View>
      ) : isError ? (
        <RetryScreen message="Couldn't load events." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No upcoming events" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[typography.h3, { color: theme.textPrimary }]}>{item.title}</Text>
              <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
                {new Date(item.date).toLocaleString()}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
});
