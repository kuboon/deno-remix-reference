/**
 * Reference app server — Remix v3 + Deno + DPoP session middleware.
 *
 * Mirrors the Remix demo layout: route definitions live in `./routes.ts`,
 * each page has a controller under `./controllers/`, and the router here
 * just wires middleware + maps routes to controllers.
 */

import { createRouter } from "@remix-run/fetch-router";
import { staticFiles } from "@remix-run/static-middleware";

import { apiController } from "./controllers/api/controller.ts";
import { notifyAction } from "./controllers/api/notify.ts";
import { homeAction } from "./controllers/home.tsx";
import { hydrationAction } from "./controllers/hydration.tsx";
import { myAction } from "./controllers/my.tsx";
import { tursoAction } from "./controllers/api/turso.ts";
import { jwksAction } from "./controllers/well_known.ts";
import { routes } from "./routes.ts";

const router = createRouter({
  middleware: [
    staticFiles(new URL("../bundled", import.meta.url).pathname),
  ],
});

router.get(routes.home, homeAction);
router.get(routes.hydration, hydrationAction);
router.get(routes.my, myAction);
router.get(routes.jwks, jwksAction);
router.post(routes.notify, notifyAction);
router.get(routes.turso, tursoAction);
router.map(routes.api, apiController);

export default router;
