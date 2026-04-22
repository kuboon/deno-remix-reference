/**
 * GET / — renders the shell (nav + `<Frame name="content">`).
 * The frame starts on /welcome (the former home intro).
 */

import type { RequestHandler } from "@remix-run/fetch-router";
import { type Dispatch, renderFrameShell } from "../lib/layout.tsx";

export const createIndexRoute = (dispatch: Dispatch): RequestHandler =>
  (ctx) => renderFrameShell(ctx.request, dispatch);
