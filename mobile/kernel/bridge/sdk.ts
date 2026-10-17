import { router } from "expo-router";
import { bridgeEventBus } from "./eventBus";
import { getKernelStorage } from "../storage/kernelStorage";
import { assertPermission, requestPermission } from "../permissions/permissions";
import { PermissionKey } from "../registry/manifest";
import { useAuthStore } from "@shared/stores/authStore";
import { BridgeEventMap, BridgeEventName } from "@app-types/bridge";
import { RootRoute } from "@app-types/navigation";
import { UserDTO } from "@app-types/api";

/**
 * Factory that produces the `wev` SDK object handed to a single mini-app.
 * Every method validates the CALLING app's manifest permissions first —
 * this is "Bridge permission validation before API call" from the spec.
 * Mini-apps only ever see the object returned here; they never import the
 * kernel internals (eventBus, kernelStorage, permissions module) directly.
 */
export function createBridgeSDK(appId: string) {
  return {
    auth: {
      getUser(): UserDTO | null {
        assertPermission(appId, "auth.getUser" as PermissionKey);
        return useAuthStore.getState().user;
      },
    },

    storage: {
      async get<T>(key: string): Promise<T | null> {
        assertPermission(appId, `storage.${appId}` as PermissionKey);
        return getKernelStorage(appId).get<T>(key);
      },
      async set<T>(key: string, value: T): Promise<void> {
        assertPermission(appId, `storage.${appId}` as PermissionKey);
        return getKernelStorage(appId).set<T>(key, value);
      },
    },

    nav: {
      navigate(route: RootRoute, params?: Record<string, string>): void {
        assertPermission(appId, "nav.navigate" as PermissionKey);
        if (params && Object.keys(params).length > 0) {
          router.push({ pathname: route, params });
        } else {
          router.push(route);
        }
      },
    },

    bridge: {
      emit<K extends BridgeEventName>(event: K, payload: BridgeEventMap[K]): void {
        assertPermission(appId, "bridge.emit" as PermissionKey);
        bridgeEventBus.emit(event, payload);
      },
      on<K extends BridgeEventName>(
        event: K,
        listener: (payload: BridgeEventMap[K]) => void
      ): () => void {
        assertPermission(appId, "bridge.on" as PermissionKey);
        return bridgeEventBus.on(event, listener);
      },
    },

    permissions: {
      async request(permission: PermissionKey): Promise<boolean> {
        return requestPermission(appId, permission);
      },
    },
  };
}

export type WevSDK = ReturnType<typeof createBridgeSDK>;
