/**
 * Reference app server — Remix v3 + Deno + DPoP session middleware.
 *
 * Wires together the fetch-router, middleware, and per-route handlers
 * defined under ./routes/. Each page handler lives in its own file to
 * keep this module focused on routing config + server bootstrap.
 */

import { createRouter } from "@remix-run/fetch-router";
import { html } from "@remix-run/html-template";
import { staticFiles } from "@remix-run/static-middleware";
import {
  createDPoPMiddleware,
  DPoPSessionKey,
  DPoPThumbprintKey,
} from "@scope/dpop-middleware";
import type { DPoPSession } from "@scope/dpop-middleware";

import { htmlResponse, layout } from "./lib/layout.ts";
import { indexRoute } from "./routes/index.tsx";
import { hydrationRoute } from "./routes/hydration.tsx";
import { signinRoute } from "./routes/signin.ts";

// ---------------------------------------------------------------------------
// Router setup
// ---------------------------------------------------------------------------

const router = createRouter({
  middleware: [
    staticFiles(new URL("../public", import.meta.url).pathname),
  ],
});

// DPoP middleware instance (shared across protected routes)
const dpopMiddleware = createDPoPMiddleware({ requireDPoP: true });

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

router.get("/", indexRoute);
router.get("/hydration", hydrationRoute);
router.get("/signin", signinRoute);

// GET /demo — interactive DPoP demo page
router.get("/demo", (_ctx) => {
  return htmlResponse(layout(
    "DPoP Demo",
    html`
      <h1>DPoP インタラクティブデモ</h1>
      <p>
        ページロード時に自動で鍵ペアを生成し、DPoP proof 付きで API を呼び出します。
        鍵ペアは IndexedDB に保存され、リロード後も同じセッションを維持します。
      </p>

      <div class="card">
        <h2>鍵情報</h2>
        <p>Thumbprint: <code id="thumbprint">(loading...)</code></p>
      </div>

      <div class="card">
        <h2>セッション操作</h2>
        <button id="btn-get">GET /api/protected</button>
        <button id="btn-post">POST データを保存</button>
        <button id="btn-post2">POST 別のデータ</button>
      </div>

      <div class="card">
        <h2>ログ</h2>
        <button id="btn-clear">ログをクリア</button>
        <div id="log"></div>
      </div>

      <script type="module" src="/demo.js"></script>
    `,
  ));
});

// ---------------------------------------------------------------------------
// Protected API routes (DPoP middleware)
// ---------------------------------------------------------------------------

// GET /api/protected — read session
router.get("/api/protected", {
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
router.post("/api/protected", {
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

const port = Number(Deno.env.get("PORT") ?? 3000);

Deno.serve({ port }, (request) => router.fetch(request));

console.log(`Server running at http://localhost:${port}`);
