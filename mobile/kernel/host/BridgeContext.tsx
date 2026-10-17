import React, { createContext, useContext, useMemo } from "react";
import { createBridgeSDK, WevSDK } from "../bridge/sdk";

const BridgeContext = createContext<WevSDK | null>(null);

export function BridgeProvider({
  appId,
  children,
}: {
  appId: string;
  children: React.ReactNode;
}) {
  const sdk = useMemo(() => createBridgeSDK(appId), [appId]);
  return <BridgeContext.Provider value={sdk}>{children}</BridgeContext.Provider>;
}

/** Hook every mini-app screen uses to get its `wev` SDK instance. Throws if
 * used outside a mounted mini-app, since that would mean no permissions
 * were ever checked. */
export function useWev(): WevSDK {
  const ctx = useContext(BridgeContext);
  if (!ctx) {
    throw new Error("useWev() must be called within a mounted mini-app (BridgeProvider missing)");
  }
  return ctx;
}
