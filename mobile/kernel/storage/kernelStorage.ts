import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Namespace-isolated storage. Each mini-app only ever gets a KernelStorage
 * instance bound to ITS OWN appId — there is no method on this class that
 * accepts a foreign namespace, so Sports literally cannot construct a key
 * that reaches into Care's storage even if it tried. Keys are physically
 * prefixed with `miniapp:<appId>:` in AsyncStorage.
 */
export class KernelStorage {
  private readonly appId: string;

  constructor(appId: string) {
    this.appId = appId;
  }

  private key(key: string): string {
    return `miniapp:${this.appId}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(this.key(key));
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(this.key(key), JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(this.key(key));
  }

  /** Lists keys belonging ONLY to this app's namespace. */
  async keys(): Promise<string[]> {
    const all = await AsyncStorage.getAllKeys();
    const prefix = `miniapp:${this.appId}:`;
    return all.filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
  }
}

const instances = new Map<string, KernelStorage>();

export function getKernelStorage(appId: string): KernelStorage {
  if (!instances.has(appId)) {
    instances.set(appId, new KernelStorage(appId));
  }
  return instances.get(appId)!;
}
