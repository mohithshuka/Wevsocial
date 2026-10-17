import { MINI_APP_MANIFESTS, MiniAppManifest } from "./manifest";

export type MiniAppStatus = "unmounted" | "mounted" | "crashed";

interface RegistryEntry {
  manifest: MiniAppManifest;
  status: MiniAppStatus;
}

/**
 * Central registry the Host Shell consults to know which mini-apps exist,
 * their manifests, and their current lifecycle status. Fault isolation is
 * enforced here: marking one app "crashed" has zero effect on entries for
 * any other app id.
 */
class MiniAppRegistryImpl {
  private entries: Map<string, RegistryEntry> = new Map();

  constructor() {
    Object.values(MINI_APP_MANIFESTS).forEach((manifest) => {
      this.entries.set(manifest.id, { manifest, status: "unmounted" });
    });
  }

  list(): RegistryEntry[] {
    return Array.from(this.entries.values());
  }

  get(appId: string): RegistryEntry | undefined {
    return this.entries.get(appId);
  }

  markMounted(appId: string): void {
    const entry = this.entries.get(appId);
    if (entry) entry.status = "mounted";
  }

  markUnmounted(appId: string): void {
    const entry = this.entries.get(appId);
    if (entry) entry.status = "unmounted";
  }

  markCrashed(appId: string): void {
    const entry = this.entries.get(appId);
    if (entry) entry.status = "crashed";
  }
}

export const MiniAppRegistry = new MiniAppRegistryImpl();
