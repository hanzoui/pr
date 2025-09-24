import type Keyv from "keyv";

export interface MethodCacheProxyOptions<T extends object> {
  store: Keyv;
  root: T;
  getKey?: (path: (string | symbol)[], args: any[]) => string;
  namespace?: string;
}

type DeepAsyncWrapper<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => Promise<any>
    ? T[K]
    : T[K] extends (...args: any[]) => any
      ? (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]>>
      : T[K] extends object
        ? DeepAsyncWrapper<T[K]>
        : T[K];
};

export class MethodCacheProxy<T extends object> {
  private store: Keyv;
  private root: T;
  private getKey: (path: (string | symbol)[], args: any[]) => string;
  private namespace: string;

  constructor(options: MethodCacheProxyOptions<T>) {
    this.store = options.store;
    this.root = options.root;
    this.namespace = options.namespace || "cache";
    this.getKey = options.getKey || this.defaultGetKey.bind(this);
  }

  private defaultGetKey(path: (string | symbol)[], args: any[]): string {
    const pathStr = path.map((p) => p.toString()).join(".");
    const argsStr = JSON.stringify(args);
    return `${this.namespace}.${pathStr}(${argsStr})`;
  }

  private createProxy(target: any, basePath: (string | symbol)[] = []): any {
    return new Proxy(target, {
      get: (obj, prop) => {
        const value = obj[prop];

        if (typeof value === "function") {
          return async (...args: any[]) => {
            const fullPath = [...basePath, prop];
            const cacheKey = this.getKey(fullPath, args);

            // Try to get from cache first
            const cached = await this.store.get(cacheKey);
            if (cached !== undefined) {
              return cached;
            }

            // Call the original function
            const result = await value.apply(obj, args);

            // Cache the result only if successful
            if (result !== undefined) {
              await this.store.set(cacheKey, result);
            }

            return result;
          };
        } else if (typeof value === "object" && value !== null) {
          // Recursively wrap nested objects
          return this.createProxy(value, [...basePath, prop]);
        }

        return value;
      },
    });
  }

  getProxy(): DeepAsyncWrapper<T> {
    return this.createProxy(this.root) as DeepAsyncWrapper<T>;
  }

  async clear(): Promise<void> {
    await this.store.clear();
  }

  async delete(path: (string | symbol)[], args: any[]): Promise<boolean> {
    const cacheKey = this.getKey(path, args);
    return await this.store.delete(cacheKey);
  }
}

export function createMethodCacheProxy<T extends object>(
  options: MethodCacheProxyOptions<T>,
): DeepAsyncWrapper<T> {
  const proxy = new MethodCacheProxy(options);
  return proxy.getProxy();
}