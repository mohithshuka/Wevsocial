import React from "react";
import { Stack } from "expo-router";
import { MountMiniApp } from "@kernel/host/MountMiniApp";

export default function SportsLayout() {
  return (
    <MountMiniApp appId="sports">
      <Stack screenOptions={{ headerShown: false }} />
    </MountMiniApp>
  );
}
