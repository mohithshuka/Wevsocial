import { useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

/**
 * Tracks connectivity and fires `onReconnect` exactly once per
 * offline->online transition (not on every network event), which is what
 * triggers the offline queue's FIFO sync.
 */
export function useNetworkSync(onReconnect: () => void): boolean {
  const [isOnline, setIsOnline] = useState(true);
  const wasOffline = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);

      if (!online) {
        wasOffline.current = true;
      } else if (wasOffline.current) {
        wasOffline.current = false;
        onReconnect();
      }
    });

    return () => unsubscribe();
  }, [onReconnect]);

  return isOnline;
}
