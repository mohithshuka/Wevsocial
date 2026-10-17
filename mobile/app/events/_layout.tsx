import React from "react";
import { Stack } from "expo-router";
import { MountMiniApp } from "@kernel/host/MountMiniApp";

export default function EventsLayout() {
  return (
    <MountMiniApp appId="events">
      <Stack screenOptions={{ headerShown: false }} />
    </MountMiniApp>
  );
}
