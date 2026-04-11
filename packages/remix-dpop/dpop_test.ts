import { assertEquals, assertRejects } from "jsr:@std/assert";
import { SignJWT, generateKeyPair, exportJWK } from "jose";
import type { JWK } from "jose";
import { verifyDPoPProof, DPoPError } from "./dpop.ts";

/** Helper: create a valid DPoP proof JWT for testing. */
async function createDPoPProof(
  privateKey: CryptoKey,
  publicJwk: JWK,
  overrides: {
    htm?: string;
    htu?: string;
    jti?: string;
    iat?: number;
    ath?: string;
    nonce?: string;
    typ?: string;
    alg?: string;
  } = {},
  requestMethod = "GET",
  requestUrl = "https://example.com/api",
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    htm: overrides.htm ?? requestMethod,
    htu: overrides.htu ?? requestUrl,
    jti: overrides.jti ?? crypto.randomUUID(),
    iat: overrides.iat ?? now,
  };
  if (overrides.ath !== undefined) payload.ath = overrides.ath;
  if (overrides.nonce !== undefined) payload.nonce = overrides.nonce;

  // deno-lint-ignore no-explicit-any
  const jwt = new SignJWT(payload as any)
    .setProtectedHeader({
      typ: (overrides.typ ?? "dpop+jwt") as string,
      alg: (overrides.alg ?? "ES256") as string,
      jwk: publicJwk,
    } as any);

  return jwt.sign(privateKey);
}

function makeRequest(
  method: string,
  url: string,
  dpopToken?: string,
): Request {
  const headers = new Headers();
  if (dpopToken) headers.set("DPoP", dpopToken);
  return new Request(url, { method, headers });
}

Deno.test("verifyDPoPProof — valid proof succeeds", async () => {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const publicJwk = await exportJWK(publicKey);

  const proof = await createDPoPProof(
    privateKey,
    publicJwk,
    {},
    "GET",
    "https://example.com/api",
  );
  const request = makeRequest("GET", "https://example.com/api", proof);
  const result = await verifyDPoPProof(request);

  assertEquals(typeof result.thumbprint, "string");
  assertEquals(result.thumbprint.length > 0, true);
  assertEquals(typeof result.jti, "string");
  assertEquals(result.jwk.kty, "EC");
});

Deno.test("verifyDPoPProof — missing DPoP header throws", async () => {
  const request = makeRequest("GET", "https://example.com/api");
  const err = await assertRejects(
    () => verifyDPoPProof(request),
    DPoPError,
  );
  assertEquals((err as DPoPError).code, "missing_dpop_header");
});

Deno.test("verifyDPoPProof — htm mismatch throws", async () => {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const publicJwk = await exportJWK(publicKey);

  const proof = await createDPoPProof(
    privateKey,
    publicJwk,
    { htm: "POST" },
    "GET",
    "https://example.com/api",
  );
  const request = makeRequest("GET", "https://example.com/api", proof);
  const err = await assertRejects(
    () => verifyDPoPProof(request),
    DPoPError,
  );
  assertEquals((err as DPoPError).code, "htm_mismatch");
});

Deno.test("verifyDPoPProof — htu mismatch throws", async () => {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const publicJwk = await exportJWK(publicKey);

  const proof = await createDPoPProof(
    privateKey,
    publicJwk,
    { htu: "https://other.com/api" },
    "GET",
    "https://example.com/api",
  );
  const request = makeRequest("GET", "https://example.com/api", proof);
  const err = await assertRejects(
    () => verifyDPoPProof(request),
    DPoPError,
  );
  assertEquals((err as DPoPError).code, "htu_mismatch");
});

Deno.test("verifyDPoPProof — missing jti throws", async () => {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const publicJwk = await exportJWK(publicKey);

  // Create proof without jti
  const payload = {
    htm: "GET",
    htu: "https://example.com/api",
    iat: Math.floor(Date.now() / 1000),
  };
  // deno-lint-ignore no-explicit-any
  const proof = await new SignJWT(payload as any)
    .setProtectedHeader({ typ: "dpop+jwt", alg: "ES256", jwk: publicJwk } as any)
    .sign(privateKey);

  const request = makeRequest("GET", "https://example.com/api", proof);
  const err = await assertRejects(
    () => verifyDPoPProof(request),
    DPoPError,
  );
  assertEquals((err as DPoPError).code, "missing_jti");
});

Deno.test("verifyDPoPProof — expired proof throws", async () => {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const publicJwk = await exportJWK(publicKey);

  // iat = 10 minutes ago
  const proof = await createDPoPProof(
    privateKey,
    publicJwk,
    { iat: Math.floor(Date.now() / 1000) - 600 },
    "GET",
    "https://example.com/api",
  );
  const request = makeRequest("GET", "https://example.com/api", proof);
  const err = await assertRejects(
    () => verifyDPoPProof(request, { maxTokenAge: "60s" }),
    DPoPError,
  );
  assertEquals((err as DPoPError).code, "invalid_proof");
});

Deno.test("verifyDPoPProof — same key produces same thumbprint", async () => {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const publicJwk = await exportJWK(publicKey);

  const proof1 = await createDPoPProof(
    privateKey,
    publicJwk,
    {},
    "GET",
    "https://example.com/api",
  );
  const proof2 = await createDPoPProof(
    privateKey,
    publicJwk,
    {},
    "POST",
    "https://example.com/api",
  );

  const request1 = makeRequest("GET", "https://example.com/api", proof1);
  const request2 = makeRequest("POST", "https://example.com/api", proof2);

  const result1 = await verifyDPoPProof(request1);
  const result2 = await verifyDPoPProof(request2);

  assertEquals(result1.thumbprint, result2.thumbprint);
});

Deno.test("verifyDPoPProof — different keys produce different thumbprints", async () => {
  const kp1 = await generateKeyPair("ES256");
  const kp2 = await generateKeyPair("ES256");
  const jwk1 = await exportJWK(kp1.publicKey);
  const jwk2 = await exportJWK(kp2.publicKey);

  const proof1 = await createDPoPProof(
    kp1.privateKey,
    jwk1,
    {},
    "GET",
    "https://example.com/api",
  );
  const proof2 = await createDPoPProof(
    kp2.privateKey,
    jwk2,
    {},
    "GET",
    "https://example.com/api",
  );

  const request1 = makeRequest("GET", "https://example.com/api", proof1);
  const request2 = makeRequest("GET", "https://example.com/api", proof2);

  const result1 = await verifyDPoPProof(request1);
  const result2 = await verifyDPoPProof(request2);

  assertEquals(result1.thumbprint !== result2.thumbprint, true);
});
