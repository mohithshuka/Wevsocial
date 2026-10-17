import { MINI_APP_MANIFESTS, PermissionKey } from "../registry/manifest";

/**
 * Every bridge/SDK call is checked against the calling mini-app's declared
 * manifest permissions BEFORE anything happens (network call, storage
 * access, navigation, etc). This is the "Bridge permission validation
 * before API call" requirement.
 */
export class PermissionDeniedError extends Error {
  constructor(appId: string, permission: PermissionKey) {
    super(`Mini-app "${appId}" is missing permission "${permission}"`);
    this.name = "PermissionDeniedError";
  }
}

export function hasPermission(appId: string, permission: PermissionKey): boolean {
  const manifest = MINI_APP_MANIFESTS[appId];
  if (!manifest) return false;
  return manifest.permissions.includes(permission);
}

export function assertPermission(appId: string, permission: PermissionKey): void {
  if (!hasPermission(appId, permission)) {
    throw new PermissionDeniedError(appId, permission);
  }
}

/** Mirrors wev.permissions.request() — in this static-manifest model,
 * permissions are granted at install/registration time, so "requesting" a
 * permission the manifest doesn't declare always resolves to false; a
 * permission the manifest DOES declare is auto-granted. */
export async function requestPermission(
  appId: string,
  permission: PermissionKey
): Promise<boolean> {
  return hasPermission(appId, permission);
}
