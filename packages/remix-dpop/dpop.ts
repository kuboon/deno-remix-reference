/**
 * DPoP (Demonstration of Proof-of-Possession) verification — RFC 9449
 *
 * Verifies DPoP proof JWTs sent in the `DPoP` HTTP header and computes
 * the JWK SHA-256 thumbprint used as the session key.
 */

import {
  jwtVerify,
  EmbeddedJWK,
  calculateJwkThumbprint,
} from "jose";
import type { JWTPayload, JWK } from "jose";

export class DPoPError extends Error {
  status: number;
  code: string;
  headers?: Record<string, string>;

  constructor(
    message: string,
    code: string,
    status = 401,
    headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "DPoPError";
    this.code = code;
    this.status = status;
    this.headers = headers;
  }
}

export interface DPoPVerifyOptions {
  /** Maximum age of the proof JWT (jose duration string). Default: "300s" */
  maxTokenAge?: string;
  /** Clock tolerance (jose duration string). Default: "5s" */
  clockTolerance?: string;
  /** Allowed signing algorithms. Default: ["ES256", "ES384", "RS256"] */
  allowedAlgorithms?: string[];
  /** If present, verify the `ath` claim against this access token */
  accessToken?: string;
  /** If present, verify the `nonce` claim */
  nonce?: string;
}

export interface DPoPVerifyResult {
  /** JWK SHA-256 thumbprint (base64url) — the session key */
  thumbprint: string;
  /** The public key extracted from the proof */
  jwk: JWK;
  /** Unique token identifier */
  jti: string;
  /** Full JWT payload */
  payload: JWTPayload;
}

/**
 * Extract the HTTP URI for DPoP `htu` comparison.
 * Per RFC 9449 §4.3, the `htu` must match the request URI
 * without query and fragment components.
 */
function extractHtu(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}${url.pathname}`;
}

/**
 * Compute base64url-encoded SHA-256 hash of an access token
 * for `ath` claim verification.
 */
async function computeAth(accessToken: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(accessToken);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64urlEncode(new Uint8Array(hash));
}

function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Verify a DPoP proof JWT from the given HTTP request.
 *
 * @param request - The incoming HTTP request containing a `DPoP` header.
 * @param options - Verification options.
 * @returns Verification result including the JWK thumbprint (session key).
 * @throws {DPoPError} on any verification failure.
 */
export async function verifyDPoPProof(
  request: Request,
  options: DPoPVerifyOptions = {},
): Promise<DPoPVerifyResult> {
  const {
    maxTokenAge = "300s",
    clockTolerance = "5s",
    allowedAlgorithms = ["ES256", "ES384", "RS256"],
    accessToken,
    nonce,
  } = options;

  // 1. Extract DPoP header
  const dpopHeader = request.headers.get("DPoP");
  if (!dpopHeader) {
    throw new DPoPError(
      "Missing DPoP header",
      "missing_dpop_header",
      401,
      { "WWW-Authenticate": "DPoP" },
    );
  }

  // 2-3. Verify JWT signature using embedded JWK, check typ and iat
  let result;
  try {
    result = await jwtVerify(dpopHeader, EmbeddedJWK, {
      typ: "dpop+jwt",
      algorithms: allowedAlgorithms,
      maxTokenAge,
      clockTolerance,
    });
  } catch (err) {
    throw new DPoPError(
      `Invalid DPoP proof: ${(err as Error).message}`,
      "invalid_proof",
      401,
      { "WWW-Authenticate": "DPoP" },
    );
  }

  const { payload, protectedHeader } = result;

  // 4. Validate htm (HTTP method)
  if (
    typeof payload.htm !== "string" ||
    payload.htm.toUpperCase() !== request.method.toUpperCase()
  ) {
    throw new DPoPError(
      `DPoP htm mismatch: expected ${request.method}, got ${payload.htm}`,
      "htm_mismatch",
      401,
    );
  }

  // 5. Validate htu (HTTP URI)
  const expectedHtu = extractHtu(request);
  if (typeof payload.htu !== "string" || payload.htu !== expectedHtu) {
    throw new DPoPError(
      `DPoP htu mismatch: expected ${expectedHtu}, got ${payload.htu}`,
      "htu_mismatch",
      401,
    );
  }

  // 6. Validate jti presence
  if (typeof payload.jti !== "string" || payload.jti.length === 0) {
    throw new DPoPError("DPoP proof missing jti claim", "missing_jti", 401);
  }

  // 7. Verify ath (access token hash) if access token provided
  if (accessToken !== undefined) {
    const expectedAth = await computeAth(accessToken);
    if (payload.ath !== expectedAth) {
      throw new DPoPError(
        "DPoP ath claim does not match access token",
        "ath_mismatch",
        401,
      );
    }
  }

  // 8. Verify nonce if required
  if (nonce !== undefined && payload.nonce !== nonce) {
    throw new DPoPError(
      "DPoP nonce mismatch",
      "nonce_mismatch",
      401,
      { "DPoP-Nonce": nonce },
    );
  }

  // 9. Compute JWK SHA-256 thumbprint
  const jwk = protectedHeader.jwk as JWK;
  if (!jwk) {
    throw new DPoPError("DPoP proof missing jwk header", "missing_jwk", 401);
  }
  const thumbprint = await calculateJwkThumbprint(jwk, "sha256");

  return {
    thumbprint,
    jwk,
    jti: payload.jti,
    payload,
  };
}
