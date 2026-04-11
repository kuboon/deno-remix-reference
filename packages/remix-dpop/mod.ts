// DPoP verification
export { verifyDPoPProof, DPoPError } from "./dpop.ts";
export type { DPoPVerifyOptions, DPoPVerifyResult } from "./dpop.ts";

// Session store
export { InMemorySessionStore, createDPoPSession } from "./session.ts";
export type { SessionStore, DPoPSession } from "./session.ts";

// Replay detection
export { InMemoryReplayDetector } from "./replay.ts";
export type { ReplayDetector } from "./replay.ts";

// Middleware
export {
  createDPoPMiddleware,
  DPoPSessionKey,
  DPoPThumbprintKey,
  DPOP_SESSION_KEY,
  DPOP_THUMBPRINT_KEY,
} from "./middleware.ts";
export type { DPoPMiddlewareOptions } from "./middleware.ts";
