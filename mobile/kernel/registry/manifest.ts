export type PermissionKey =
  | "auth.getUser"
  | "storage.sports"
  | "storage.care"
  | "storage.events"
  | "bridge.emit"
  | "bridge.on"
  | "nav.navigate"
  | "permissions.request";

export interface MiniAppManifest {
  id: string;
  name: string;
  version: string;
  entry: string;
  permissions: PermissionKey[];
}

/**
 * Static manifest registry. In this project the kernel loads manifests
 * bundled with the app (mirrors what /mini-apps returns from the backend),
 * which is what allows Dynamic Mounting/Unmounting to happen purely by id
 * without any mini-app importing another mini-app's code directly.
 */
export const MINI_APP_MANIFESTS: Record<string, MiniAppManifest> = {
  sports: {
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
  },
  care: {
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
  },
  events: {
    id: "events",
    name: "Events",
    version: "1.0.0",
    entry: "mini-apps/events",
    permissions: ["storage.events", "nav.navigate"],
  },
};
