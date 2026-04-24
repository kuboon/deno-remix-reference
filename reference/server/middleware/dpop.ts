/**
 * DPoP middleware — verifies RFC 9449 DPoP proofs on incoming requests and
 * exposes the session + thumbprint via context keys.
 *
 * Thin wrapper over `@scope/dpop-middleware` so controllers can import a
 * pre-configured middleware + re-export the context keys from one place.
 */

import { createDPoPMiddleware } from "@scope/dpop-middleware";

export {
  type DPoPSession,
  DPoPSessionKey,
  DPoPThumbprintKey,
} from "@scope/dpop-middleware";

export const dpop = createDPoPMiddleware({ requireDPoP: true });
