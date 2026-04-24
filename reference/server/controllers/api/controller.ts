/**
 * /api/protected — DPoP-protected JSON endpoints.
 *
 * Both actions require a valid DPoP proof (see `middleware/dpop.ts`).
 * GET returns the session payload; POST merges the request body into it.
 */

import type { Controller } from "@remix-run/fetch-router";

import {
  dpop,
  type DPoPSession,
  DPoPSessionKey,
  DPoPThumbprintKey,
} from "../../middleware/dpop.ts";
import type { routes } from "../../routes.ts";

export const apiController = {
  middleware: [dpop],
  actions: {
    protectedGet(context) {
      const session = context.get(DPoPSessionKey) as DPoPSession;
      const thumbprint = context.get(DPoPThumbprintKey) as string;
      return Response.json({
        thumbprint,
        sessionData: session.data,
        message: "DPoP proof verified successfully",
      });
    },

    async protectedPost(context) {
      const session = context.get(DPoPSessionKey) as DPoPSession;
      const thumbprint = context.get(DPoPThumbprintKey) as string;

      const body = await context.request.json();
      session.data = { ...session.data, ...body };
      await session.save();

      return Response.json({
        thumbprint,
        sessionData: session.data,
        message: "Session data updated",
      });
    },
  },
} satisfies Controller<typeof routes.api>;
