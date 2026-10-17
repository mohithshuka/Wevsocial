import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string | null;
}

/** Last-resort boundary around the entire app (host shell + kernel + all mini-apps). */
export class RootErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[RootErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ hasError: false, message: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>WEV crashed</Text>
          <Text style={styles.message}>{this.state.message}</Text>
          <Pressable style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Reload</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#0B0F14",
  },
  title: { color: "#F26D70", fontSize: 22, fontWeight: "700", marginBottom: 8 },
  message: { color: "#93A0AE", textAlign: "center", marginBottom: 20 },
  button: {
    backgroundColor: "#5B8DEF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  buttonText: { color: "#0B0F14", fontWeight: "700" },
});
