import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { BlurView } from "expo-blur";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "../hooks/useTheme";
import { spacing, radius, typography } from "../theme/tokens";
import { SkeletonBlock } from "./SkeletonLoader";
import { CareLocationDTO } from "@app-types/api";

interface MapPreviewProps {
  location: CareLocationDTO | null | undefined;
  loading?: boolean;
  height?: number;
}

const DEFAULT_HEIGHT = 220;

/** Renders only the location precision that the API has authorized. */
export function MapPreview({ location, loading, height = DEFAULT_HEIGHT }: MapPreviewProps) {
  const theme = useTheme();

  if (loading || !location) {
    return <View style={[styles.container, { height }]}><SkeletonBlock height={height} style={{ borderRadius: radius.md }} /></View>;
  }

  const coordinate = { latitude: location.lat, longitude: location.lng };

  return (
    <Animated.View entering={FadeIn.duration(350)} style={styles.container}>
      <View style={[styles.mapWrap, { height, borderColor: theme.border }]}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={{ ...coordinate, latitudeDelta: location.isExact ? 0.009 : 0.018, longitudeDelta: location.isExact ? 0.009 : 0.018 }}
          showsCompass={location.isExact}
          scrollEnabled={location.isExact}
          zoomEnabled={location.isExact}
        >
          {location.isExact ? <Marker coordinate={coordinate} title="Host location" pinColor={theme.primary} /> : null}
        </MapView>
        {!location.isExact ? (
          <BlurView intensity={80} tint="default" style={StyleSheet.absoluteFillObject} />
        ) : null}
      </View>
      <Text style={[typography.caption, { color: theme.textSecondary, marginTop: spacing.xs }]}>
        {location.isExact ? "Exact host location" : (location.message ?? "Approximate host location, about 500 m away.")}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  mapWrap: { width: "100%", borderRadius: radius.md, borderWidth: 1, overflow: "hidden" },
});
