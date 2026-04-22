/**
 * Reference app server — Remix v3 + Deno + DPoP session middleware.
 *
 * Wires together the fetch-router, middleware, and per-route handlers
 * defined under ./routes/. Each page handler lives in its own file to
 * keep this module focused on routing config + server bootstrap.
 */

import { indexRoute } from "./routes/index.tsx";
import { welcomeRoute } from "./routes/welcome.tsx";
import { hydrationRoute } from "./routes/hydration.tsx";
import { signinRoute } from "./routes/signin.tsx";

import {
  createDPoPMiddleware,
  type DPoPSession,
  DPoPSessionKey,
  DPoPThumbprintKey,
} from "@scope/dpop-middleware";

import { createRouter } from "@remix-run/fetch-router";
import { route } from "@remix-run/fetch-router/routes";
import { staticFiles } from "@remix-run/static-middleware";

const routes = route({
  home: "/",
  welcome: "/welcome",
  signin: "/signin",
  hydration: "/hydration",
  api: {
    protected: "/api/protected",
  },
});

const router = createRouter({
  middleware: [
    staticFiles(new URL("../public", import.meta.url).pathname),
  ],
});

const dpopMiddleware = createDPoPMiddleware({ requireDPoP: true });

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

router.get(routes.home, indexRoute);
router.get(routes.welcome, welcomeRoute);
router.get(routes.hydration, hydrationRoute);
router.get(routes.signin, signinRoute);

// GET /api/protected — read session
router.get(routes.api.protected, {
  middleware: [dpopMiddleware],
  handler(ctx) {
    const session = ctx.get(DPoPSessionKey) as DPoPSession;
    const thumbprint = ctx.get(DPoPThumbprintKey) as string;
    return Response.json({
      thumbprint,
      sessionData: session.data,
      message: "DPoP proof verified successfully",
    });
  },
});

// POST /api/protected — write session data
router.post(routes.api.protected, {
  middleware: [dpopMiddleware],
  async handler(ctx) {
    const session = ctx.get(DPoPSessionKey) as DPoPSession;
    const thumbprint = ctx.get(DPoPThumbprintKey) as string;

    const body = await ctx.request.json();
    session.data = { ...session.data, ...body };
    await session.save();

    return Response.json({
      thumbprint,
      sessionData: session.data,
      message: "Session data updated",
    });
  },
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

export default router;
