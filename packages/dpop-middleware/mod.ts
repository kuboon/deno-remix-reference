/**
 * DPoP session middleware for Remix v3 (fetch-router).
 *
 * Uses @kuboon/dpop for proof verification and adds session management
 * keyed by the JWK thumbprint of the DPoP public key.
 */

import {
  verifyDpopProofFromRequest,
  type VerifyDpopProofResult,
} from "@kuboon/dpop/server.ts";
import type { VerifyDpopProofOptions } from "@kuboon/dpop/types.ts";
import { computeThumbprint } from "@kuboon/dpop/common.ts";

// ---------------------------------------------------------------------------
// Session store
// ---------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
export interface SessionStore<T = Record<string, any>> {
  get(thumbprint: string): Promise<T | null>;
  set(thumbprint: string, data: T): Promise<void>;
  delete(thumbprint: string): Promise<void>;
}

// deno-lint-ignore no-explicit-any
export class InMemorySessionStore<T = Record<string, any>>
  implements SessionStore<T> {
  private store = new Map<string, { data: T; expiresAt: number }>();
  private defaultTtl: number;

  constructor(defaultTtlMs = 3_600_000) {
    this.defaultTtl = defaultTtlMs;
  }

  // deno-lint-ignore require-await
  async get(thumbprint: string): Promise<T | null> {
    const entry = this.store.get(thumbprint);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(thumbprint);
      return null;
    }
    return entry.data;
  }

  // deno-lint-ignore require-await
  async set(thumbprint: string, data: T): Promise<void> {
    this.store.set(thumbprint, {
      data,
      expiresAt: Date.now() + this.defaultTtl,
    });
  }

  // deno-lint-ignore require-await
  async delete(thumbprint: string): Promise<void> {
    this.store.delete(thumbprint);
  }
}

// ---------------------------------------------------------------------------
// DPoP Session
// ---------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
export interface DPoPSession<T = Record<string, any>> {
  readonly thumbprint: string;
  readonly jwk: JsonWebKey;
  data: T;
  save(): Promise<void>;
  destroy(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Replay detector
// ---------------------------------------------------------------------------

export interface ReplayDetector {
  /** Return true if the jti is acceptable (not replayed). */
  check(jti: string): boolean | Promise<boolean>;
}

export class InMemoryReplayDetector implements ReplayDetector {
  private seen = new Set<string>();
  check(jti: string): boolean {
    if (this.seen.has(jti)) return false;
    this.seen.add(jti);
    return true;
  }
}

// ---------------------------------------------------------------------------
// Middleware options
// ---------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
export interface DPoPMiddlewareOptions<T = Record<string, any>> {
  sessionStore?: SessionStore<T>;
  replayDetector?: ReplayDetector;
  maxAgeSeconds?: number;
  clockSkewSeconds?: number;
  requireDPoP?: boolean;
  onError?: (error: string, request: Request) => Response | Promise<Response>;
  defaultSessionData?: () => T;
}

// ---------------------------------------------------------------------------
// Context keys
// ---------------------------------------------------------------------------

export const DPoPSessionKey: { defaultValue?: DPoPSession } = {};
export const DPoPThumbprintKey: { defaultValue?: string } = {};

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
export function createDPoPMiddleware<T = Record<string, any>>(
  options: DPoPMiddlewareOptions<T> = {},
) {
  const {
    sessionStore = new InMemorySessionStore<T>() as SessionStore<T>,
    replayDetector = new InMemoryReplayDetector(),
    maxAgeSeconds = 300,
    clockSkewSeconds = 60,
    requireDPoP = true,
    onError,
    defaultSessionData,
  } = options;

  const verifyOptions: VerifyDpopProofOptions = {
    maxAgeSeconds,
    clockSkewSeconds,
    checkReplay: (jti: string) => replayDetector.check(jti),
  };

  // deno-lint-ignore no-explicit-any
  return async function dpopMiddleware(
    ctx: any,
    next: () => Promise<Response>,
  ): Promise<Response | void> {
    const request: Request = ctx.request;

    if (
      !requireDPoP && !request.headers.has("DPoP") &&
      !request.headers.has("dpop")
    ) {
      return next();
    }

    const result: VerifyDpopProofResult = await verifyDpopProofFromRequest(
      request,
      verifyOptions,
    );

    if (!result.valid) {
      if (onError) return onError(result.error, request);
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    // Compute JWK thumbprint as session key
    const thumbprint = await computeThumbprint(result.jwk);

    // Get or create session
    let data: T = (await sessionStore.get(thumbprint)) as T;
    if (data === null || data === undefined) {
      data = defaultSessionData ? defaultSessionData() : ({} as T);
      await sessionStore.set(thumbprint, data);
    }

    const session: DPoPSession<T> = {
      thumbprint,
      jwk: result.jwk,
      data,
      async save() {
        await sessionStore.set(thumbprint, this.data);
      },
      async destroy() {
        await sessionStore.delete(thumbprint);
      },
    };

    if (ctx && typeof ctx.set === "function") {
      ctx.set(DPoPSessionKey, session);
      ctx.set(DPoPThumbprintKey, thumbprint);
    }

    const response = await next();
    await session.save();
    return response;
  };
}
