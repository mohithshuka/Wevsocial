import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { careApi } from "../api/careApi";
import { useCareStore } from "../store/careStore";
import { enqueueCareBooking } from "../offline/syncCare";
import { useTheme } from "@shared/hooks/useTheme";
import { ApiRequestError } from "@shared/api/httpClient";
import { generateClientRequestId } from "@shared/utils/id";
import { spacing, radius, typography } from "@shared/theme/tokens";

export function CareBookingScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{
    providerId?: string;
    prefillStartTime?: string;
    prefillDurationMins?: string;
  }>();
  const upsert = useCareStore((s) => s.upsert);

  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    params.providerId ?? null
  );
  const [submitting, setSubmitting] = useState(false);

  const { data: providers } = useQuery({
    queryKey: ["care", "providers"],
    queryFn: () => careApi.listProviders(),
  });

  const startTime = params.prefillStartTime ?? new Date(Date.now() + 3600_000).toISOString();
  const durationMins = params.prefillDurationMins ? Number(params.prefillDurationMins) : 120;

  const provider = useMemo(
    () => providers?.find((p) => p.id === selectedProviderId),
    [providers, selectedProviderId]
  );

  const isPrefilled = Boolean(params.prefillStartTime);

  async function handleBook(): Promise<void> {
    if (!selectedProviderId || !provider) {
      Alert.alert("Pick a provider", "Please select a childcare provider first.");
      return;
    }

    setSubmitting(true);
    const clientRequestId = generateClientRequestId("care");
    const input = {
      providerId: selectedProviderId,
      startTime,
      durationMins,
      clientRequestId,
    };

    upsert({
      clientRequestId,
      providerId: selectedProviderId,
      providerName: provider.name,
      startTime,
      durationMins,
      state: "QUEUED",
    });

    try {
      await careApi.createBooking(input);
      useCareStore.getState().setState(clientRequestId, "SUCCESS");
      Alert.alert(
        "Booking created",
        `${provider.name} — confirm your booking to reveal the exact location.`
      );
      router.replace("/care/bookings");
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        useCareStore.getState().setState(clientRequestId, "CONFLICT_REJECTED");
        Alert.alert("Slot taken", "That provider is already booked at that time.");
        return;
      }
      await enqueueCareBooking(input);
      Alert.alert("Saved offline", "You're offline — this booking will sync automatically.");
      router.back();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={{ padding: spacing.md }}>
        <Text style={[typography.h1, { color: theme.textPrimary }]}>Book childcare</Text>

        {isPrefilled ? (
          <View style={[styles.prefillNote, { backgroundColor: theme.surfaceAlt }]}>
            <Text style={[typography.caption, { color: theme.textSecondary }]}>
              Prefilled from your Sports booking: {new Date(startTime).toLocaleString()} ·{" "}
              {durationMins} min
            </Text>
          </View>
        ) : null}

        <Text style={[typography.h3, { color: theme.textPrimary, marginTop: spacing.lg }]}>
          Provider
        </Text>
        <View style={styles.chipColumn}>
          {(providers ?? []).map((p) => {
            const selected = selectedProviderId === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setSelectedProviderId(p.id)}
                style={[
                  styles.providerRow,
                  {
                    backgroundColor: selected ? theme.primary : theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={{ color: selected ? theme.primaryText : theme.textPrimary, fontWeight: "600" }}>
                  {p.name}
                </Text>
                <Text
                  style={{
                    color: selected ? theme.primaryText : theme.textSecondary,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {p.category}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[typography.h3, { color: theme.textPrimary, marginTop: spacing.lg }]}>
          Slot
        </Text>
        <Text style={[typography.body, { color: theme.textSecondary, marginTop: spacing.xs }]}>
          {new Date(startTime).toLocaleString()} for {durationMins} minutes
        </Text>

        <Pressable
          disabled={submitting}
          onPress={handleBook}
          style={[styles.submitButton, { backgroundColor: theme.primary, opacity: submitting ? 0.6 : 1 }]}
        >
          <Text style={{ color: theme.primaryText, fontWeight: "700" }}>
            {submitting ? "Booking…" : "Confirm childcare"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  prefillNote: { padding: spacing.sm, borderRadius: radius.sm, marginTop: spacing.sm },
  chipColumn: { gap: spacing.sm, marginTop: spacing.sm },
  providerRow: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  submitButton: {
    marginTop: spacing.xl,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
  },
});
