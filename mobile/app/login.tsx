import React, { useState } from "react";
import { Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { router, Link } from "expo-router";
import { authApi, ApiRequestError } from "@shared/api/httpClient";
import { useAuthStore } from "@shared/stores/authStore";
import { useTheme } from "@shared/hooks/useTheme";
import { spacing, radius, typography } from "@shared/theme/tokens";

export default function LoginScreen() {
  const theme = useTheme();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("user@wev.dev");
  const [password, setPassword] = useState("Password123!");
  const [loading, setLoading] = useState(false);

  async function handleLogin(): Promise<void> {
    setLoading(true);
    try {
      const result = await authApi.login(email, password);
      await setSession(result.user, result.accessToken, result.refreshToken);
      router.replace("/");
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "Login failed";
      Alert.alert("Login failed", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Text style={[typography.h1, { color: theme.textPrimary, marginBottom: spacing.lg }]}>
        Welcome back
      </Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        keyboardType="email-address"
        style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry
        style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
      />

      <Pressable
        disabled={loading}
        onPress={handleLogin}
        style={[styles.button, { backgroundColor: theme.primary, opacity: loading ? 0.6 : 1 }]}
      >
        <Text style={{ color: theme.primaryText, fontWeight: "700" }}>
          {loading ? "Signing in…" : "Sign in"}
        </Text>
      </Pressable>

      <Link href="/register" style={{ marginTop: spacing.md, textAlign: "center" }}>
        <Text style={{ color: theme.primary }}>Don&apos;t have an account? Register</Text>
      </Link>

      <Text style={[typography.caption, { color: theme.textSecondary, marginTop: spacing.xl, textAlign: "center" }]}>
        Seeded demo accounts: user@wev.dev · host@wev.dev · admin@wev.dev{"\n"}Password: Password123!
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: spacing.lg },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  button: { paddingVertical: 14, borderRadius: radius.md, alignItems: "center", marginTop: spacing.sm },
});
