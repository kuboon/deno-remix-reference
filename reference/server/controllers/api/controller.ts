/**
 * /api/protected — DPoP-protected JSON endpoints.
 *
 * Both actions require a valid DPoP proof (see `middleware/dpop.ts`).
 * GET returns the session payload; POST merges the request body into it.
 */

import type { Controller } from "@remix-run/fetch-router";

import { dpop, DpopSession } from "../../middleware/dpop.ts";
import type { routes } from "../../routes.ts";

export const apiController = {
  middleware: [dpop],
  actions: {
    protectedGet(context) {
      const session = context.get(DpopSession);
      const [data] = session.data;
      return Response.json({
        thumbprint: session.thumbprint,
        sessionData: data,
        message: "DPoP proof verified successfully",
      });
    },

    async protectedPost(context) {
      const session = context.get(DpopSession);
      const body = await context.request.json() as Record<string, unknown>;
      for (const [k, v] of Object.entries(body)) {
        session.set(k, v);
      }
      const [data] = session.data;

      return Response.json({
        thumbprint: session.thumbprint,
        sessionData: data,
        message: "Session data updated",
      });
    },
  },
} satisfies Controller<typeof routes.api>;
