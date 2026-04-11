/**
 * DPoP session middleware for Remix v3.
 *
 * Compatible with Remix v3's fetch-router Middleware interface:
 *   (context: RequestContext, next: NextFunction) => Response | void | Promise<Response | void>
 *
 * Creates a middleware function that:
 * 1. Verifies the DPoP proof in the request
 * 2. Checks for replay attacks
 * 3. Binds a session to the JWK thumbprint
 * 4. Makes the session available via route context
 */

import { verifyDPoPProof, DPoPError } from "./dpop.ts";
import type { DPoPVerifyOptions } from "./dpop.ts";
import { InMemoryReplayDetector } from "./replay.ts";
import type { ReplayDetector } from "./replay.ts";
import { InMemorySessionStore, createDPoPSession } from "./session.ts";
import type { SessionStore, DPoPSession } from "./session.ts";

// deno-lint-ignore no-explicit-any
export interface DPoPMiddlewareOptions<T = Record<string, any>> {
  /** Session store implementation. Default: InMemorySessionStore */
  sessionStore?: SessionStore<T>;
  /** Replay detector implementation. Default: InMemoryReplayDetector */
  replayDetector?: ReplayDetector;
  /** Maximum age of DPoP proofs (jose duration string). Default: "300s" */
  maxTokenAge?: string;
  /** Clock tolerance (jose duration string). Default: "5s" */
  clockTolerance?: string;
  /** Allowed signing algorithms. Default: ["ES256", "ES384", "RS256"] */
  allowedAlgorithms?: string[];
  /** If false, requests without DPoP header pass through. Default: true */
  requireDPoP?: boolean;
  /** Custom error handler */
  onError?: (error: DPoPError, request: Request) => Response | Promise<Response>;
  /** Default session data for new sessions */
  defaultSessionData?: () => T;
}

/**
 * Context key objects for type-safe context access.
 * Use these with `context.get(DPoPSessionKey)` and `context.set(DPoPSessionKey, session)`.
 */
export const DPoPSessionKey: { defaultValue?: DPoPSession } = {};
export const DPoPThumbprintKey: { defaultValue?: string } = {};

/** @deprecated Use DPoPSessionKey instead */
export const DPOP_SESSION_KEY = "dpopSession";
/** @deprecated Use DPoPThumbprintKey instead */
export const DPOP_THUMBPRINT_KEY = "dpopThumbprint";

/**
 * Create a DPoP middleware function compatible with Remix v3's fetch-router.
 *
 * Remix v3 middleware signature:
 *   (context: RequestContext, next: () => Promise<Response>) => Response | void | Promise<Response | void>
 *
 * The middleware sets values in the route context accessible via:
 * ```ts
 * import { DPoPSessionKey, DPoPThumbprintKey } from "@repo/remix-dpop";
 *
 * // In a route handler:
 * const session = context.get(DPoPSessionKey);
 * const thumbprint = context.get(DPoPThumbprintKey);
 * ```
 */
// deno-lint-ignore no-explicit-any
export function createDPoPMiddleware<T = Record<string, any>>(
  options: DPoPMiddlewareOptions<T> = {},
) {
  const {
    sessionStore = new InMemorySessionStore<T>() as SessionStore<T>,
    replayDetector = new InMemoryReplayDetector(),
    maxTokenAge = "300s",
    clockTolerance = "5s",
    allowedAlgorithms,
    requireDPoP = true,
    onError,
    defaultSessionData,
  } = options;

  const verifyOptions: DPoPVerifyOptions = {
    maxTokenAge,
    clockTolerance,
    allowedAlgorithms,
  };

  /**
   * The actual middleware function.
   * Accepts either Remix v3 style (context, next) or a generic { request, context } style.
   */
  // deno-lint-ignore no-explicit-any
  return async function dpopMiddleware(contextOrArgs: any, next: () => Promise<Response>): Promise<Response | void> {
    // Support both Remix v3 (context has .request) and generic ({ request, context }) signatures
    const request: Request = contextOrArgs.request;
    const context = contextOrArgs.set ? contextOrArgs : contextOrArgs.context;

    // If DPoP header is absent and not required, pass through
    if (!requireDPoP && !request.headers.has("DPoP")) {
      return next();
    }

    try {
      // 1. Verify the DPoP proof
      const result = await verifyDPoPProof(request, verifyOptions);

      // 2. Check for replay
      const isReplay = await replayDetector.seen(result.jti, result.thumbprint);
      if (isReplay) {
        throw new DPoPError(
          "DPoP proof has already been used (replay detected)",
          "replay_detected",
          401,
        );
      }

      // 3. Mark as used (expire after maxTokenAge)
      const maxAgeSec = parseInt(maxTokenAge) || 300;
      const expiresAt = new Date(Date.now() + maxAgeSec * 1000);
      await replayDetector.markUsed(result.jti, result.thumbprint, expiresAt);

      // 4. Get or create session
      let data: T = (await sessionStore.get(result.thumbprint)) as T;
      if (data === null || data === undefined) {
        data = defaultSessionData ? defaultSessionData() : ({} as T);
        await sessionStore.set(result.thumbprint, data);
      }

      // 5. Create session wrapper
      const session = createDPoPSession<T>(
        result.thumbprint,
        result.jwk,
        data,
        sessionStore,
      );

      // 6. Set context values (supports both key styles)
      if (context && typeof context.set === "function") {
        context.set(DPoPSessionKey, session);
        context.set(DPoPThumbprintKey, result.thumbprint);
        // Also set string keys for convenience
        context.set(DPOP_SESSION_KEY, session);
        context.set(DPOP_THUMBPRINT_KEY, result.thumbprint);
      }

      // 7. Call next middleware / handler
      const response = await next();

      // 8. Auto-save session after response
      await session.save();

      return response;
    } catch (err) {
      if (err instanceof DPoPError) {
        if (onError) {
          return onError(err, request);
        }
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...err.headers,
        };
        return new Response(
          JSON.stringify({ error: err.code, message: err.message }),
          { status: err.status, headers },
        );
      }
      throw err;
    }
  };
}
