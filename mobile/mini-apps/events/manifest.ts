import { MiniAppManifest } from "@kernel/registry/manifest";

export const eventsManifest: MiniAppManifest = {
  id: "events",
  name: "Events",
  version: "1.0.0",
  entry: "mini-apps/events",
  permissions: ["storage.events", "nav.navigate"],
};
