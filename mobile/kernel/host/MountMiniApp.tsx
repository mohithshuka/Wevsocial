import React, { useEffect } from "react";
import { MiniAppRegistry } from "../registry/registry";
import { MINI_APP_MANIFESTS } from "../registry/manifest";
import { MiniAppErrorBoundary } from "../errorBoundary/MiniAppErrorBoundary";
import { BridgeProvider } from "./BridgeContext";

interface Props {
  appId: string;
  children: React.ReactNode;
}

/**
 * Every mini-app route group is wrapped in exactly one of these. It:
 *  1. Looks the app up in the MiniAppRegistry (Dynamic Mounting).
 *  2. Marks it unmounted again on unmount (Unmounting).
 *  3. Wraps children in a dedicated MiniAppErrorBoundary (Fault Isolation).
 *  4. Provides a BridgeProvider scoped to exactly this appId's permissions.
 */
export function MountMiniApp({ appId, children }: Props) {
  const manifest = MINI_APP_MANIFESTS[appId];

  useEffect(() => {
    MiniAppRegistry.markMounted(appId);
    return () => {
      MiniAppRegistry.markUnmounted(appId);
    };
  }, [appId]);

  if (!manifest) {
    throw new Error(`No manifest registered for mini-app "${appId}"`);
  }

  return (
    <MiniAppErrorBoundary appId={appId}>
      <BridgeProvider appId={appId}>{children}</BridgeProvider>
    </MiniAppErrorBoundary>
  );
}
