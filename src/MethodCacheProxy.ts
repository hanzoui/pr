import type Keyv from "keyv";

export interface MethodCacheProxyOptions<T extends object> {
  store: Keyv;
  root: T;
  getKey?: (path: (string | symbol)[], args: any[]) => string;
  shouldCache?: (path: (string | symbol)[], args: any[], result: any, error?: Error) => boolean;
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
  private proxy: DeepAsyncWrapper<T>;
  private store: Keyv;
  private getKey: (path: (string | symbol)[], args: any[]) => string;
  private shouldCache: (path: (string | symbol)[], args: any[], result: any, error?: Error) => boolean;

  constructor(options: MethodCacheProxyOptions<T>) {
    this.store = options.store;
    this.getKey = options.getKey || this.defaultGetKey;
    this.shouldCache = options.shouldCache || this.defaultShouldCache;
    this.proxy = this.createProxy(options.root) as DeepAsyncWrapper<T>;
  }

  private defaultGetKey(path: (string | symbol)[], args: any[]): string {
    // Default implementation similar to existing code
    const pathStr = path.map(p => p.toString()).join(".");
    const argsStr = JSON.stringify(args);
    return `${pathStr}(${argsStr})`;
  }

  private defaultShouldCache(path: (string | symbol)[], args: any[], result: any, error?: Error): boolean {
    // Don't cache if there's an error
    if (error) return false;
    // Cache successful results by default
    return true;
  }

  private createProxy(target: any, basePath: (string | symbol)[] = []): any {
    return new Proxy(target, {
      get: (obj, prop) => {
        const value = obj[prop];

        if (typeof value === "function") {
          return async (...args: any[]) => {
            const path = [...basePath, prop];
            const cacheKey = this.getKey(path, args);

            // Try to get from cache first
            const cached = await this.store.get(cacheKey);
            if (cached !== undefined) {
              return cached;
            }

            // Call the original function
            let result: any;
            let error: Error | undefined;

            try {
              result = await value.apply(obj, args);
            } catch (e) {
              error = e as Error;
              throw e;
            } finally {
              // Cache the result if shouldCache returns true
              if (!error && this.shouldCache(path, args, result, error)) {
                await this.store.set(cacheKey, result);
              }
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
    return this.proxy;
  }

  async clear(): Promise<void> {
    await this.store.clear();
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async get(key: string): Promise<any> {
    return this.store.get(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    return this.store.set(key, value, ttl);
  }
}