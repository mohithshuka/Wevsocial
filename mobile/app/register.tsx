import React, { useState } from "react";
import { Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { router, Link } from "expo-router";
import { authApi, ApiRequestError } from "@shared/api/httpClient";
import { useAuthStore } from "@shared/stores/authStore";
import { useTheme } from "@shared/hooks/useTheme";
import { spacing, radius, typography } from "@shared/theme/tokens";

export default function RegisterScreen() {
  const theme = useTheme();
  const setSession = useAuthStore((s) => s.setSession);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(): Promise<void> {
    setLoading(true);
    try {
      const result = await authApi.register(email, password, name);
      await setSession(result.user, result.accessToken, result.refreshToken);
      router.replace("/");
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "Registration failed";
      Alert.alert("Registration failed", message);
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
        Create account
      </Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Full name"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
      />
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
        placeholder="Password (min 8 chars)"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry
        style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
      />

      <Pressable
        disabled={loading}
        onPress={handleRegister}
        style={[styles.button, { backgroundColor: theme.primary, opacity: loading ? 0.6 : 1 }]}
      >
        <Text style={{ color: theme.primaryText, fontWeight: "700" }}>
          {loading ? "Creating…" : "Create account"}
        </Text>
      </Pressable>

      <Link href="/login" style={{ marginTop: spacing.md, textAlign: "center" }}>
        <Text style={{ color: theme.primary }}>Already have an account? Sign in</Text>
      </Link>
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
