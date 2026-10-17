import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MiniAppRegistry } from "../registry/registry";
import { bridgeEventBus } from "../bridge/eventBus";

interface Props {
  appId: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string | null;
}

/**
 * Wraps EVERY mounted mini-app individually. A crash inside Sports is
 * caught HERE and never propagates past this boundary, so Care and Events
 * (mounted as siblings, each in their own boundary) are completely
 * unaffected — this is the fault isolation requirement, and it's what
 * backs Sports' debug crash button.
 */
export class MiniAppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error): void {
    MiniAppRegistry.markCrashed(this.props.appId);
    bridgeEventBus.emit("MINI_APP_CRASHED", {
      appId: this.props.appId,
      message: error.message,
    });
    // eslint-disable-next-line no-console
    console.error(`[MiniAppErrorBoundary:${this.props.appId}]`, error);
  }

  reset = (): void => {
    MiniAppRegistry.markUnmounted(this.props.appId);
    this.setState({ hasError: false, message: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>
            &quot;{this.props.appId}&quot; crashed
          </Text>
          <Text style={styles.message}>{this.state.message}</Text>
          <Text style={styles.hint}>
            Other mini-apps are unaffected by this crash.
          </Text>
          <Pressable style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Remount</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { color: "#E5484D", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  message: { color: "#5B6470", textAlign: "center", marginBottom: 8 },
  hint: { color: "#5B6470", fontSize: 12, textAlign: "center", marginBottom: 16 },
  button: {
    backgroundColor: "#2F6FED",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "600" },
});
