/**
 * Reference app server — Remix v3 + Deno + DPoP session middleware.
 *
 * Mirrors the Remix demo layout: route definitions live in `./routes.ts`,
 * each page has a controller under `./controllers/`, and the router here
 * just wires middleware + maps routes to controllers.
 */

import { createRouter, type Middleware } from "@remix-run/fetch-router";
import { staticFiles } from "@remix-run/static-middleware";

import { apiController } from "./controllers/api/controller.ts";
import { notifyAction } from "./controllers/api/notify.ts";
import { homeAction } from "./controllers/home.tsx";
import { hydrationAction } from "./controllers/hydration.tsx";
import { myAction } from "./controllers/my.tsx";
import { tursoAction } from "./controllers/api/turso.ts";
import { jwksAction } from "./controllers/well_known.ts";
import { routes } from "./routes.ts";

/**
 * `@remix-run/static-middleware@0.4.13` — still the latest as of Remix v3
 * beta.6 — pins `@remix-run/fetch-router@^0.20.1`, which excludes 0.21.0. Deno
 * therefore resolves a second copy of fetch-router for it, and the two
 * `Middleware` types stop matching: `RequestContext` carries a private-field
 * brand, so they do not even overlap enough for a single cast.
 *
 * static-middleware imports fetch-router with `import type` only and never
 * calls into it at runtime, so the duplicate is purely nominal and re-typing it
 * here is sound. Drop this once static-middleware widens its range.
 */
const serveBundled = staticFiles(
  new URL("../bundled", import.meta.url).pathname,
) as unknown as Middleware;

const router = createRouter({
  middleware: [serveBundled],
});

router.get(routes.home, homeAction);
router.get(routes.hydration, hydrationAction);
router.get(routes.my, myAction);
router.get(routes.jwks, jwksAction);
router.post(routes.notify, notifyAction);
router.get(routes.turso, tursoAction);
router.map(routes.api, apiController);

export default router;
