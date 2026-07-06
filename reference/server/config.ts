/**
 * Server-side configuration for the reference RP app.
 *
 * Values are read from the environment once at module load. The push send
 * path (`lib/push/client.ts`) authenticates to the IdP as this app, so it
 * needs to know both the IdP origin and this app's own public origin (its
 * `clientId`, which must be present in the IdP's `AUTHORIZE_WHITELIST`).
 */

/** Origin of the IdP (id.kbn.one). Mirrors the client's `IDP_ORIGIN`. */
export const idpOrigin = Deno.env.get("IDP_ORIGIN") ?? "https://id.kbn.one";

/**
 * This app's own public origin — used as the `clientId` / `iss` / `sub` of the
 * `private_key_jwt` client assertion. Must equal the origin the IdP fetches
 * `/.well-known/jwks.json` from, and must be whitelisted on the IdP. Empty
 * until configured; the send path surfaces a clear error in that case.
 */
export const rpOrigin = Deno.env.get("RP_ORIGIN") ?? "";

/**
 * Optional ES256 private key (JWK JSON) used to sign client assertions and
 * publish JWKS. When unset, an ephemeral key is generated per process — fine
 * for local development, but set this in production so restarts don't rotate
 * the key out from under the IdP's JWKS cache.
 */
export const rpSigningKeyJwk = Deno.env.get("RP_SIGNING_KEY_JWK") ?? "";

/**
 * Turso (libSQL) connection for the `/api/turso` sample. `TURSO_DATABASE_URL`
 * is the database URL (e.g. `libsql://<db>-<org>.turso.io`), `TURSO_AUTH_TOKEN`
 * the access token. Both empty by default; the sample reports "not configured"
 * until `TURSO_DATABASE_URL` is set. A local file URL (`file:local.db`) also
 * works for development.
 */
export const tursoDatabaseUrl = Deno.env.get("TURSO_DATABASE_URL") ?? "";
export const tursoAuthToken = Deno.env.get("TURSO_AUTH_TOKEN") ?? "";
