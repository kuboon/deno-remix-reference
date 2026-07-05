/**
 * Server-side configuration for the reference RP app.
 *
 * Values are read from the environment once at module load. The push send
 * path (`lib/push/client.ts`) authenticates to the IdP as this app, so it
 * needs to know both the IdP origin and this app's own public origin (its
 * `clientId`, which must be present in the IdP's `AUTHORIZE_WHITELIST`).
 */

/**
 * Ensure an origin carries an explicit scheme. A bare host like
 * `rp.example.com` is promoted to `https://rp.example.com`; values that
 * already specify `http://`/`https://` (e.g. `http://localhost:3000` for
 * local dev) are kept as-is. Empty stays empty.
 */
export const withScheme = (origin: string): string =>
  !origin || /^https?:\/\//i.test(origin) ? origin : `https://${origin}`;

/** Origin of the IdP (id.kbn.one). Mirrors the client's `IDP_ORIGIN`. */
export const idpOrigin = withScheme(
  Deno.env.get("IDP_ORIGIN") ?? "https://id.kbn.one",
);

/**
 * This app's own public origin — used as the `clientId` / `iss` / `sub` of the
 * `private_key_jwt` client assertion. Must equal the origin the IdP fetches
 * `/.well-known/jwks.json` from, and must be whitelisted on the IdP. Empty
 * until configured; the send path surfaces a clear error in that case.
 *
 * Normalized to include a scheme: the IdP compares the `clientId` against its
 * `AUTHORIZE_WHITELIST` and fetches `${clientId}/.well-known/jwks.json`, both
 * of which need an absolute origin. A `RP_ORIGIN` set without `https://` is
 * promoted rather than silently sent scheme-less.
 */
export const rpOrigin = withScheme(Deno.env.get("RP_ORIGIN") ?? "");

/**
 * Optional ES256 private key (JWK JSON) used to sign client assertions and
 * publish JWKS. When unset, an ephemeral key is generated per process — fine
 * for local development, but set this in production so restarts don't rotate
 * the key out from under the IdP's JWKS cache.
 */
export const rpSigningKeyJwk = Deno.env.get("RP_SIGNING_KEY_JWK") ?? "";
