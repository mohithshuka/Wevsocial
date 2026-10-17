import React from "react";
import { Stack } from "expo-router";
import { MountMiniApp } from "@kernel/host/MountMiniApp";

export default function CareLayout() {
  return (
    <MountMiniApp appId="care">
      <Stack screenOptions={{ headerShown: false }} />
    </MountMiniApp>
  );
}
