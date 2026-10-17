import React, { useEffect } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { careApi } from "../api/careApi";
import { useCareStore } from "../store/careStore";
import { useWev } from "@kernel/host/BridgeContext";
import { ProviderDTO } from "@app-types/api";
import { useTheme } from "@shared/hooks/useTheme";
import { SkeletonList } from "@shared/components/SkeletonLoader";
import { EmptyState } from "@shared/components/EmptyState";
import { RetryScreen } from "@shared/components/RetryScreen";
import { spacing, radius, typography } from "@shared/theme/tokens";

/**
 * "Need childcare during this session?" banner. Rendered whenever a
 * BOOKING_CREATED event (emitted by Sports for an exactly-2-hour booking)
 * arrives over the bridge. Tapping it deep-links into Care's booking screen
 * with the time slot prefilled — Care never imports Sports; it only reacts
 * to the typed bridge payload.
 */
function CrossAppSuggestionBanner() {
  const theme = useTheme();
  const wev = useWev();
  const suggestion = useCareStore((s) => s.incomingSuggestion);
  const setSuggestion = useCareStore((s) => s.setSuggestion);

  useEffect(() => {
    const unsubscribe = wev.bridge.on("BOOKING_CREATED", (payload) => {
      setSuggestion(payload);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!suggestion) return null;

  return (
    <Pressable
      style={[styles.banner, { backgroundColor: theme.primary }]}
      onPress={() => {
        wev.nav.navigate("/care/book", {
          prefillStartTime: suggestion.startTime,
          prefillDurationMins: String(suggestion.durationMins),
        });
        setSuggestion(null);
      }}
    >
      <Text style={[typography.body, { color: theme.primaryText, fontWeight: "700" }]}>
        Need childcare during this session?
      </Text>
      <Text style={[typography.caption, { color: theme.primaryText, marginTop: 2 }]}>
        You booked "{suggestion.activityTitle}" for {suggestion.durationMins} min — tap to
        arrange care for the same window.
      </Text>
    </Pressable>
  );
}

export function ProviderListScreen() {
  const theme = useTheme();

  const { data, isLoading, isError, refetch } = useQuery<ProviderDTO[]>({
    queryKey: ["care", "providers"],
    queryFn: () => careApi.listProviders(),
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, styles.headerRow]}>
        <Text style={[typography.h1, { color: theme.textPrimary }]}>Care</Text>
        <Pressable onPress={() => router.push("/care/bookings")}>
          <Text style={[typography.body, { color: theme.primary, fontWeight: "600" }]}>
            My bookings
          </Text>
        </Pressable>
      </View>

      <CrossAppSuggestionBanner />

      {isLoading ? (
        <View style={{ padding: spacing.md }}>
          <SkeletonList rows={4} />
        </View>
      ) : isError ? (
        <RetryScreen message="Couldn't load providers." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No providers nearby" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => router.push({ pathname: "/care/book", params: { providerId: item.id } })}
            >
              <Text style={[typography.h3, { color: theme.textPrimary }]}>{item.name}</Text>
              <Text style={[typography.caption, { color: theme.primary, marginTop: 2 }]}>
                {item.category}
              </Text>
              <Text style={[typography.body, { color: theme.textSecondary, marginTop: 4 }]}>
                {item.bio}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  banner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  card: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
});
