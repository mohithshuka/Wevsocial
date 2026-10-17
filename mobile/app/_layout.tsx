import React, { useEffect, useCallback } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { RootErrorBoundary } from "@kernel/errorBoundary/RootErrorBoundary";
import { useAuthStore } from "@shared/stores/authStore";
import { useNetworkSync } from "@shared/hooks/useNetworkSync";
import { syncSportsQueue } from "@mini-apps/sports/offline/syncSports";
import { syncCareQueue } from "@mini-apps/care/offline/syncCare";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleReconnect = useCallback(() => {
    // Reconnect detection -> drain BOTH mini-apps' FIFO offline queues.
    // Cold start target (<2s) is preserved since this runs after mount,
    // not blocking first paint.
    syncSportsQueue();
    syncCareQueue();
  }, []);

  useNetworkSync(handleReconnect);

  if (!isHydrated) {
    // Intentionally minimal — this is the only screen rendered before
    // hydration completes, keeping cold start fast.
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
      </RootErrorBoundary>
    </GestureHandlerRootView>
  );
}
