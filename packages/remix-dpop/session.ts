/**
 * DPoP session store.
 *
 * Maps JWK SHA-256 thumbprints to session data.
 * The interface is pluggable — production deployments can swap in
 * Redis, Deno KV, or any persistent store.
 */

import type { JWK } from "jose";

// deno-lint-ignore no-explicit-any
export interface SessionStore<T = Record<string, any>> {
  get(thumbprint: string): Promise<T | null>;
  set(thumbprint: string, data: T, options?: { ttl?: number }): Promise<void>;
  delete(thumbprint: string): Promise<void>;
}

/**
 * A DPoP-bound session object passed to route handlers via context.
 */
// deno-lint-ignore no-explicit-any
export interface DPoPSession<T = Record<string, any>> {
  /** JWK SHA-256 thumbprint identifying this session */
  readonly thumbprint: string;
  /** The public key from the DPoP proof */
  readonly jwk: JWK;
  /** Session data — read and mutate freely, then call save() */
  data: T;
  /** Persist session data to the store */
  save(): Promise<void>;
  /** Delete this session from the store */
  destroy(): Promise<void>;
}

interface StoreEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * In-memory session store. Suitable for development and demos.
 */
// deno-lint-ignore no-explicit-any
export class InMemorySessionStore<T = Record<string, any>>
  implements SessionStore<T>
{
  private store = new Map<string, StoreEntry<T>>();
  private defaultTtl: number;
  private cleanupIntervalId: number | undefined;

  /** @param defaultTtl Default time-to-live in milliseconds. Default: 1 hour. */
  constructor(defaultTtl = 3_600_000, cleanupIntervalMs = 60_000) {
    this.defaultTtl = defaultTtl;
    this.cleanupIntervalId = setInterval(
      () => this.cleanup(),
      cleanupIntervalMs,
    ) as unknown as number;
    if (typeof Deno !== "undefined") {
      Deno.unrefTimer(this.cleanupIntervalId);
    }
  }

  async get(thumbprint: string): Promise<T | null> {
    const entry = this.store.get(thumbprint);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(thumbprint);
      return null;
    }
    return entry.data;
  }

  async set(
    thumbprint: string,
    data: T,
    options?: { ttl?: number },
  ): Promise<void> {
    const ttl = options?.ttl ?? this.defaultTtl;
    this.store.set(thumbprint, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  async delete(thumbprint: string): Promise<void> {
    this.store.delete(thumbprint);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
      }
    }
  }

  dispose(): void {
    if (this.cleanupIntervalId !== undefined) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }
  }
}

/**
 * Create a DPoPSession wrapper around a store entry.
 */
// deno-lint-ignore no-explicit-any
export function createDPoPSession<T = Record<string, any>>(
  thumbprint: string,
  jwk: JWK,
  data: T,
  store: SessionStore<T>,
): DPoPSession<T> {
  return {
    thumbprint,
    jwk,
    data,
    async save() {
      await store.set(thumbprint, this.data);
    },
    async destroy() {
      await store.delete(thumbprint);
    },
  };
}
