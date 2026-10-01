/**
 * Every URL the app answers, in one place.
 *
 * `server/router.tsx` maps these to the controllers that answer them, and everything that links
 * reads `routes.my.href()` rather than rebuilding `${base}/my` at each call site.
 *
 * The map is built with the deploy prefix as its base, so hrefs are correct under a GitHub Pages
 * repo sub-path or a PR preview URL without anyone prepending anything. On Deno Deploy `base` is
 * empty.
 *
 * Two kinds of route live here and they are deployed differently:
 *
 * - **Pages** (`home`, `hydration`, `my`) are rendered to static HTML by the GitHub Pages build as
 *   well as served live by Deno Deploy.
 * - **Server routes** (`jwks` and everything under `api`) only exist on the live server. Nothing
 *   links to them, so the static build's crawl never reaches them, and they are not in
 *   `entryPoints`. The client may still name them (`routes.api.notify.href()`), which is why the
 *   shapes are stated here — a static deploy simply has no server to answer them.
 */

import { get, post, route } from "@remix-run/fetch-router/routes";

import { base } from "./base.ts";

export const routes = route(base, {
  home: get("/"),
  hydration: get("/hydration"),
  my: get("/my"),
  // RP public JWKS — lets the IdP verify our `private_key_jwt` assertions.
  jwks: get("/.well-known/jwks.json"),
  api: route("api", {
    // Server-initiated push fan-out (delegates to the IdP). Not DPoP-protected.
    notify: post("/notify"),
    // Turso (libSQL) + @remix-run/data-table sample.
    turso: get("/turso"),
    // DPoP-protected JSON endpoints; `server/router.tsx` puts the DPoP middleware on this group.
    protected: route("protected", {
      get: get("/"),
      post: post("/"),
    }),
  }),
});
