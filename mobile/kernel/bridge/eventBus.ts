import { BridgeEventMap, BridgeEventName } from "@app-types/bridge";

type Listener<K extends BridgeEventName> = (payload: BridgeEventMap[K]) => void;

/**
 * The ONLY channel mini-apps may use to talk to each other. There is no
 * mechanism here (or anywhere in the kernel) for a mini-app to import
 * another mini-app's module directly — this event bus is the sole crossing
 * point, and every payload is fully typed via BridgeEventMap.
 */
class BridgeEventBus {
  private listeners: Map<BridgeEventName, Set<Listener<BridgeEventName>>> = new Map();

  emit<K extends BridgeEventName>(event: K, payload: BridgeEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach((listener) => {
      try {
        (listener as Listener<K>)(payload);
      } catch (err) {
        // A listener throwing must NEVER crash the emitter or other
        // listeners — this is part of fault isolation between mini-apps.
        // eslint-disable-next-line no-console
        console.warn(`[bridge] listener for "${event}" threw`, err);
      }
    });
  }

  on<K extends BridgeEventName>(event: K, listener: Listener<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as Listener<BridgeEventName>);
    return () => {
      this.listeners.get(event)?.delete(listener as Listener<BridgeEventName>);
    };
  }
}

export const bridgeEventBus = new BridgeEventBus();
