import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "../hooks/useTheme";
import { radius } from "../theme/tokens";

interface SkeletonBlockProps {
  height?: number;
  width?: number | `${number}%`;
  style?: ViewStyle;
}

export function SkeletonBlock({ height = 16, width = "100%", style }: SkeletonBlockProps) {
  const theme = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          height,
          width,
          backgroundColor: theme.surfaceAlt,
          borderRadius: radius.sm,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.card}>
          <SkeletonBlock height={18} width="60%" style={{ marginBottom: 8 }} />
          <SkeletonBlock height={14} width="90%" style={{ marginBottom: 6 }} />
          <SkeletonBlock height={14} width="40%" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  card: { padding: 16, borderRadius: radius.md },
});
