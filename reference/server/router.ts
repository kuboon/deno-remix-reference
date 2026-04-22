/**
 * Reference app server — Remix v3 + Deno + DPoP session middleware.
 *
 * Wires together the fetch-router, middleware, and per-route handlers
 * defined under ./routes/. Each page handler lives in its own file to
 * keep this module focused on routing config + server bootstrap.
 *
 * Content routes are factories that take a `dispatch` function so the
 * shell's `resolveFrame` can re-enter the router to fetch fragments.
 */

import { createIndexRoute } from "./routes/index.tsx";
import { createWelcomeRoute } from "./routes/welcome.tsx";
import { createHydrationRoute } from "./routes/hydration.tsx";
import { createSigninRoute } from "./routes/signin.tsx";
import type { Dispatch } from "./lib/layout.tsx";

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

const dispatch: Dispatch = (request) => router.fetch(request);

const dpopMiddleware = createDPoPMiddleware({ requireDPoP: true });

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

router.get(routes.home, createIndexRoute(dispatch));
router.get(routes.welcome, createWelcomeRoute(dispatch));
router.get(routes.hydration, createHydrationRoute(dispatch));
router.get(routes.signin, createSigninRoute(dispatch));

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
