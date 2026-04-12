/**
 * Reference app server — Remix v3 + Deno + DPoP session middleware.
 *
 * Uses Remix v3's fetch-router with:
 * - DPoP session middleware from @scope/dpop-middleware
 * - Static file serving for /public
 * - HTML template rendering
 */

import { createRouter, createContextKey } from "@remix-run/fetch-router";
import { html } from "@remix-run/html-template";
import type { SafeHtml } from "@remix-run/html-template";
import { staticFiles } from "@remix-run/static-middleware";
import {
  createDPoPMiddleware,
  DPoPSessionKey,
  DPoPThumbprintKey,
} from "@scope/dpop-middleware";
import type { DPoPSession } from "@scope/dpop-middleware";
import { renderCounter } from "../shared/counter.ts";

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

function htmlResponse(content: SafeHtml): Response {
  return new Response(String(content), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

const layout = (title: string, body: SafeHtml) => html`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — DPoP Reference</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1a1a1a; }
    h1 { margin-bottom: 1rem; }
    h2 { margin-top: 2rem; margin-bottom: 0.5rem; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; font-size: 0.9rem; margin: 0.5rem 0; }
    code { font-family: 'Fira Code', monospace; }
    a { color: #0066cc; }
    button { padding: 0.5rem 1rem; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 1rem; margin: 0.25rem; }
    button:hover { background: #e8e8e8; }
    .success { color: #16a34a; }
    .error { color: #dc2626; }
    #log { margin-top: 1rem; background: #1a1a1a; color: #e8e8e8; padding: 1rem; border-radius: 4px; min-height: 200px; max-height: 400px; overflow-y: auto; font-family: monospace; font-size: 0.85rem; white-space: pre-wrap; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; }
    nav { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #ddd; }
    nav a { margin-right: 1rem; }
    .counter { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 1.25rem; }
    .counter output { min-width: 3ch; text-align: center; font-variant-numeric: tabular-nums; font-weight: 600; }
    .counter-label { color: #666; font-size: 0.9rem; margin-left: 0.5rem; }
    .counter[data-hydrated="true"] { outline: 2px solid #16a34a; outline-offset: 4px; border-radius: 4px; }
  </style>
</head>
<body>
  <nav><a href="/">Home</a><a href="/demo">DPoP Demo</a><a href="/hydration">Hydration</a></nav>
  ${body}
</body>
</html>`;

// GET /
router.get("/", (_ctx) => {
  return htmlResponse(layout(
      "Home",
      html`
        <h1>Remix v3 + DPoP Session Manager</h1>
        <p>Deno + Remix v3 (fetch-router) リファレンス実装。</p>

        <div class="card">
          <h2>DPoP (RFC 9449) とは</h2>
          <p>DPoP はクライアントの公開鍵でリクエストに暗号署名を添付し、
          その公開鍵のフィンガープリント (JWK Thumbprint) をセッションキーとして使う仕組みです。
          Cookie を使わずにセッションを特定のクライアントに紐付けられます。</p>
        </div>

        <div class="card">
          <h2>構成</h2>
          <ul>
            <li><code>packages/dpop/</code> — DPoP proof 生成・検証ライブラリ</li>
            <li><code>packages/dpop-middleware/</code> — DPoP セッション middleware</li>
            <li><code>reference/</code> — この Web アプリ</li>
          </ul>
        </div>

        <div class="card">
          <h2>API エンドポイント</h2>
          <ul>
            <li><code>GET /api/protected</code> — DPoP 保護。セッション情報を返す</li>
            <li><code>POST /api/protected</code> — DPoP 保護。セッションにデータを書き込む</li>
          </ul>
        </div>

        <p style="margin-top: 2rem;"><a href="/demo">→ インタラクティブデモを試す</a></p>
      `,
    ));
});

// GET /demo — interactive DPoP demo page
router.get("/demo", (_ctx) => {
  return htmlResponse(layout(
      "DPoP Demo",
      html`
        <h1>DPoP インタラクティブデモ</h1>
        <p>ページロード時に自動で鍵ペアを生成し、DPoP proof 付きで API を呼び出します。
        鍵ペアは IndexedDB に保存され、リロード後も同じセッションを維持します。</p>

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

// GET /hydration — component hydration demo
router.get("/hydration", (_ctx) => {
  // Initial state is computed on the server (e.g. could be from DB, session,
  // or a random seed). It's sent to the client both as rendered HTML and as
  // a JSON data island that the client reads to rebuild its in-memory state.
  const initialState = {
    count: Math.floor(Math.random() * 10),
    label: `server-rendered at ${new Date().toISOString()}`,
  };

  return htmlResponse(layout(
    "Hydration Demo",
    html`
      <h1>コンポーネントハイドレーションのサンプル</h1>
      <p>サーバーとクライアントで <strong>同じ <code>renderCounter()</code> 関数</strong> を共有し、
      まずサーバーで HTML を生成 (SSR) → クライアントでイベントハンドラーを付与 (hydrate) → 以降は
      クライアントで state 更新するたびに同じ関数で再描画するパターンです。</p>

      <div class="card">
        <h2>Counter (SSR + hydrate)</h2>
        <p>初期カウント・ラベルはサーバーが決定しています。ハイドレート完了後に緑の枠線が付きます。</p>
        <div id="counter-root">${renderCounter(initialState)}</div>
        <p style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
          JavaScript を無効にしてリロードしても、カウンター自体は表示されます (ボタンは動きません)。
        </p>
      </div>

      <div class="card">
        <h2>仕組み</h2>
        <ol style="padding-left: 1.5rem;">
          <li>サーバーが <code>renderCounter(state)</code> で HTML を生成し、
            <code>&lt;script type="application/json" id="__HYDRATION_STATE__"&gt;</code>
            に初期 state を JSON で埋め込む</li>
          <li>ブラウザは <code>/hydration.js</code> をロードし、JSON を読んで state を復元</li>
          <li>既存 DOM にイベントハンドラーを付けるだけで <em>hydrate</em> 完了</li>
          <li>クリック後は同じ <code>renderCounter()</code> を呼び、<code>innerHTML</code> を差し替えて再描画</li>
        </ol>
      </div>

      <script type="application/json" id="__HYDRATION_STATE__">${
        html.raw`${JSON.stringify(initialState).replaceAll("</", "<\\/")}`
      }</script>
      <script type="module" src="/hydration.js"></script>
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
