import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router, Redirect } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { MiniAppRegistry } from "@kernel/registry/registry";
import { useAuthStore } from "@shared/stores/authStore";
import { useTheme } from "@shared/hooks/useTheme";
import { spacing, radius, typography } from "@shared/theme/tokens";

const APP_ROUTES: Record<string, string> = {
  sports: "/sports",
  care: "/care",
  events: "/events",
};

export default function HostShellScreen() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [, forceRerender] = useState(0);

  useEffect(() => {
    // Re-render once mini-apps mount/unmount so status badges stay fresh.
    const interval = setInterval(() => forceRerender((n) => n + 1), 1500);
    return () => clearInterval(interval);
  }, []);

  if (!user) {
    return <Redirect href="/login" />;
  }

  const entries = MiniAppRegistry.list();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[typography.h1, { color: theme.textPrimary }]}>WEV</Text>
          <Text style={[typography.caption, { color: theme.textSecondary }]}>
            Signed in as {user.name} · {user.role}
          </Text>
        </View>
        <Pressable
          onPress={async () => {
            await clearSession();
            router.replace("/login");
          }}
        >
          <Text style={{ color: theme.danger, fontWeight: "600" }}>Log out</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {entries.map((entry, i) => (
          <Animated.View
            key={entry.manifest.id}
            entering={FadeInDown.delay(i * 60).duration(300)}
            style={styles.cardWrap}
          >
            <Pressable
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => router.push(APP_ROUTES[entry.manifest.id] as never)}
            >
              <Text style={[typography.h3, { color: theme.textPrimary }]}>
                {entry.manifest.name}
              </Text>
              <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
                v{entry.manifest.version}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      entry.status === "crashed"
                        ? theme.danger
                        : entry.status === "mounted"
                          ? theme.success
                          : theme.surfaceAlt,
                  },
                ]}
              >
                <Text style={styles.statusText}>{entry.status}</Text>
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: spacing.xl },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  cardWrap: { width: "47%" },
  card: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, minHeight: 110 },
  statusBadge: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF", textTransform: "uppercase" },
});
