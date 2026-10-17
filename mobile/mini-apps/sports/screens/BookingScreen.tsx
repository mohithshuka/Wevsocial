import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { sportsApi } from "../api/sportsApi";
import { useSportsStore } from "../store/sportsStore";
import { enqueueSportsBooking } from "../offline/syncSports";
import { useWev } from "@kernel/host/BridgeContext";
import { useTheme } from "@shared/hooks/useTheme";
import { ApiRequestError } from "@shared/api/httpClient";
import { generateClientRequestId } from "@shared/utils/id";
import { spacing, radius, typography } from "@shared/theme/tokens";

const DURATION_PRESETS = [60, 90, 120];

export function BookingScreen() {
  const theme = useTheme();
  const wev = useWev();
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const upsert = useSportsStore((s) => s.upsert);

  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [submitting, setSubmitting] = useState(false);

  const { data: activities } = useQuery({
    queryKey: ["sports", "activities"],
    queryFn: sportsApi.listActivities,
  });

  const activity = useMemo(
    () => activities?.find((a) => a.id === activityId),
    [activities, activityId]
  );

  if (!activity) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textPrimary, padding: spacing.md }}>Loading activity…</Text>
      </View>
    );
  }

  async function handleBook(): Promise<void> {
    if (!selectedStart || !activity) {
      Alert.alert("Pick a time", "Please select a start time first.");
      return;
    }

    setSubmitting(true);
    const clientRequestId = generateClientRequestId("sports");
    const input = {
      activityId: activity.id,
      startTime: selectedStart,
      durationMins: selectedDuration,
      clientRequestId,
    };

    // Optimistic UI: reflect the booking immediately, before the network
    // call resolves.
    upsert({
      clientRequestId,
      activityId: activity.id,
      activityTitle: activity.title,
      startTime: selectedStart,
      durationMins: selectedDuration,
      state: "QUEUED",
    });

    try {
      const booking = await sportsApi.createBooking(input);
      useSportsStore.getState().setState(clientRequestId, "SUCCESS");

      // Cross-app communication: a booking of EXACTLY 2 hours emits
      // BOOKING_CREATED over the bridge. Care listens for this — Sports
      // never imports Care directly.
      if (selectedDuration === 120) {
        wev.bridge.emit("BOOKING_CREATED", {
          source: "sports",
          bookingId: booking.id,
          activityId: activity.id,
          activityTitle: activity.title,
          startTime: selectedStart,
          durationMins: selectedDuration,
        });
      }

      Alert.alert("Booked!", `${activity.title} confirmed.`);
      router.back();
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        useSportsStore.getState().setState(clientRequestId, "CONFLICT_REJECTED");
        Alert.alert("Slot taken", "That time slot was just booked by someone else.");
        return;
      }
      // Any other failure (most commonly: offline) — queue it for FIFO sync.
      await enqueueSportsBooking(input);
      Alert.alert("Saved offline", "You're offline — this booking will sync automatically.");
      router.back();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={{ padding: spacing.md }}>
        <Text style={[typography.h1, { color: theme.textPrimary }]}>{activity.title}</Text>
        <Text style={[typography.body, { color: theme.textSecondary, marginTop: 4 }]}>
          {activity.description}
        </Text>

        <Text style={[typography.h3, { color: theme.textPrimary, marginTop: spacing.lg }]}>
          Start time
        </Text>
        <View style={styles.chipRow}>
          {activity.startTimes.map((time) => {
            const selected = selectedStart === time;
            return (
              <Pressable
                key={time}
                onPress={() => setSelectedStart(time)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? theme.primary : theme.surfaceAlt,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: selected ? theme.primaryText : theme.textPrimary,
                    fontSize: 13,
                  }}
                >
                  {new Date(time).toLocaleString()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[typography.h3, { color: theme.textPrimary, marginTop: spacing.lg }]}>
          Duration
        </Text>
        <View style={styles.chipRow}>
          {DURATION_PRESETS.map((mins) => {
            const selected = selectedDuration === mins;
            return (
              <Pressable
                key={mins}
                onPress={() => setSelectedDuration(mins)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? theme.primary : theme.surfaceAlt,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={{ color: selected ? theme.primaryText : theme.textPrimary }}>
                  {mins} min{mins === 120 ? " (triggers Care)" : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          disabled={submitting}
          onPress={handleBook}
          style={[styles.submitButton, { backgroundColor: theme.primary, opacity: submitting ? 0.6 : 1 }]}
        >
          <Text style={{ color: theme.primaryText, fontWeight: "700" }}>
            {submitting ? "Booking…" : "Confirm booking"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1 },
  submitButton: {
    marginTop: spacing.xl,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
  },
});
