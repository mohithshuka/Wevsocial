import { MiniAppManifest } from "@kernel/registry/manifest";

export const sportsManifest: MiniAppManifest = {
  id: "sports",
  name: "Sports",
  version: "1.0.0",
  entry: "mini-apps/sports",
  permissions: [
    "auth.getUser",
    "storage.sports",
    "bridge.emit",
    "bridge.on",
    "nav.navigate",
  ],
};
