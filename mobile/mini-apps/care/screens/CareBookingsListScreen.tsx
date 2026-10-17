import React from "react";
import { Alert, View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { careApi } from "../api/careApi";
import { useTheme } from "@shared/hooks/useTheme";
import { SkeletonList } from "@shared/components/SkeletonLoader";
import { EmptyState } from "@shared/components/EmptyState";
import { RetryScreen } from "@shared/components/RetryScreen";
import { MapPreview } from "@shared/components/MapPreview";
import { spacing, radius, typography } from "@shared/theme/tokens";
import { CareBookingDTO } from "@app-types/api";

const BOOKINGS_QUERY_KEY = ["care", "myBookings"] as const;

export function CareBookingsListScreen() {
  const theme = useTheme();
  const { data, isLoading, isError, refetch } = useQuery<CareBookingDTO[]>({
    queryKey: BOOKINGS_QUERY_KEY,
    queryFn: () => careApi.listMyBookings(),
  });
  const bookings = latestActiveBookingByProvider(data ?? []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[typography.h1, { color: theme.textPrimary }]}>My bookings</Text>
      </View>
      {isLoading ? (
        <View style={{ padding: spacing.md }}><SkeletonList rows={3} /></View>
      ) : isError ? (
        <RetryScreen message="Couldn't load your bookings." onRetry={() => refetch()} />
      ) : bookings.length === 0 ? (
        <EmptyState title="No bookings yet" subtitle="Book a childcare provider to see it here." />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
          renderItem={({ item }) => <CareBookingCard booking={item} />}
        />
      )}
    </View>
  );
}

function latestActiveBookingByProvider(bookings: CareBookingDTO[]): CareBookingDTO[] {
  const latestByProvider = new Map<string, CareBookingDTO>();
  for (const booking of bookings) {
    if (booking.status === "CANCELLED" || booking.status === "CONFLICT_REJECTED") continue;
    if (!latestByProvider.has(booking.providerId)) latestByProvider.set(booking.providerId, booking);
  }
  return [...latestByProvider.values()];
}

function CareBookingCard({ booking }: { booking: CareBookingDTO }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const confirmMutation = useMutation({
    mutationFn: () => careApi.confirmBooking(booking.id),
    onSuccess: (confirmedBooking) => {
      queryClient.setQueryData<CareBookingDTO[]>(BOOKINGS_QUERY_KEY, (current = []) =>
        current.map((item) => (item.id === confirmedBooking.id ? confirmedBooking : item))
      );
    },
    onError: () => Alert.alert("Could not confirm booking", "Please try again."),
  });
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.cardHeaderRow}>
        <Text style={[typography.h3, { color: theme.textPrimary }]}>{booking.providerName}</Text>
        <StatusBadge status={booking.status} />
      </View>
      <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>{booking.providerCategory}</Text>
      <Text style={[typography.body, { color: theme.textSecondary, marginTop: spacing.xs }]}>
        {new Date(booking.startTime).toLocaleString()} · {booking.durationMins} min
      </Text>
      <Text style={[typography.caption, styles.sectionLabel, { color: theme.textPrimary }]}>Location</Text>
      <MapPreview location={booking.location} />
      {booking.status === "PENDING" ? (
        <Pressable
          disabled={confirmMutation.isPending}
          onPress={() => confirmMutation.mutate()}
          style={[styles.confirmButton, { backgroundColor: theme.primary, opacity: confirmMutation.isPending ? 0.6 : 1 }]}
        >
          <Text style={{ color: theme.primaryText, fontWeight: "700" }}>
            {confirmMutation.isPending ? "Confirming..." : "Confirm booking & reveal location"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function StatusBadge({ status }: { status: CareBookingDTO["status"] }) {
  const theme = useTheme();
  const colorMap: Record<CareBookingDTO["status"], string> = {
    PENDING: theme.warning,
    CONFIRMED: theme.success,
    CANCELLED: theme.textSecondary,
    CONFLICT_REJECTED: theme.danger,
  };
  return <View style={[styles.badge, { backgroundColor: colorMap[status] }]}><Text style={styles.badgeText}>{status}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  card: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionLabel: { marginTop: spacing.md, marginBottom: spacing.xs, fontWeight: "700" },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  confirmButton: { marginTop: spacing.md, paddingVertical: 12, borderRadius: radius.sm, alignItems: "center" },
});
