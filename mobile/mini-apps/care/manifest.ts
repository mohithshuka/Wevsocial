import { MiniAppManifest } from "@kernel/registry/manifest";

export const careManifest: MiniAppManifest = {
  id: "care",
  name: "Care",
  version: "1.0.0",
  entry: "mini-apps/care",
  permissions: [
    "auth.getUser",
    "storage.care",
    "bridge.emit",
    "bridge.on",
    "nav.navigate",
  ],
};
