/**
 * Reference app server — Remix v3 + Deno + DPoP session middleware.
 *
 * Uses Remix v3's fetch-router with:
 * - DPoP session middleware from @repo/remix-dpop
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
} from "@repo/remix-dpop";
import type { DPoPSession } from "@repo/remix-dpop";

// ---------------------------------------------------------------------------
// Router setup
// ---------------------------------------------------------------------------

const router = createRouter({
  middleware: [
    staticFiles(new URL("./public", import.meta.url).pathname),
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
  </style>
</head>
<body>
  <nav><a href="/">Home</a><a href="/demo">DPoP Demo</a></nav>
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
            <li><code>packages/remix-dpop/</code> — DPoP セッションマネージャー (middleware)</li>
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
        <p>ブラウザ上で鍵ペアを生成し、DPoP proof を作成して API を呼び出します。</p>

        <div class="card">
          <h2>1. 鍵ペアの生成</h2>
          <button id="btn-keygen">鍵ペアを生成</button>
          <pre id="keygen-result">まだ生成されていません</pre>
        </div>

        <div class="card">
          <h2>2. セッション操作</h2>
          <button id="btn-get">GET /api/protected</button>
          <button id="btn-post">POST データを保存</button>
          <button id="btn-post2">POST 別のデータ</button>
        </div>

        <div class="card">
          <h2>ログ</h2>
          <button id="btn-clear">ログをクリア</button>
          <div id="log"></div>
        </div>

        <script type="module">
          // --- jose is loaded from esm.sh CDN for client-side DPoP proof generation ---
          const jose = await import("https://esm.sh/jose@6");

          const log = document.getElementById("log");
          function appendLog(msg, cls) {
            const line = document.createElement("div");
            if (cls) line.className = cls;
            line.textContent = msg;
            log.appendChild(line);
            log.scrollTop = log.scrollHeight;
          }

          let keyPair = null;
          let publicJwk = null;

          // 1. Key generation
          document.getElementById("btn-keygen").addEventListener("click", async () => {
            keyPair = await crypto.subtle.generateKey(
              { name: "ECDSA", namedCurve: "P-256" },
              true,
              ["sign", "verify"]
            );
            publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
            // Keep only required JWK fields for DPoP
            const minimalJwk = { kty: publicJwk.kty, crv: publicJwk.crv, x: publicJwk.x, y: publicJwk.y };
            document.getElementById("keygen-result").textContent = JSON.stringify(minimalJwk, null, 2);
            const thumbprint = await jose.calculateJwkThumbprint(minimalJwk, "sha256");
            appendLog("鍵ペアを生成しました。Thumbprint: " + thumbprint, "success");
          });

          // DPoP proof 作成ヘルパー
          async function createDPoPProof(method, url) {
            if (!keyPair) { appendLog("先に鍵ペアを生成してください", "error"); return null; }
            const minimalJwk = { kty: publicJwk.kty, crv: publicJwk.crv, x: publicJwk.x, y: publicJwk.y };

            // Build JWT header and payload manually, then sign
            const header = { typ: "dpop+jwt", alg: "ES256", jwk: minimalJwk };
            const payload = {
              htm: method,
              htu: url,
              jti: crypto.randomUUID(),
              iat: Math.floor(Date.now() / 1000),
            };

            // Encode
            const enc = new TextEncoder();
            function b64url(data) {
              return btoa(String.fromCharCode(...new Uint8Array(data)))
                .replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
            }
            const headerB64 = b64url(enc.encode(JSON.stringify(header)));
            const payloadB64 = b64url(enc.encode(JSON.stringify(payload)));
            const signingInput = enc.encode(headerB64 + "." + payloadB64);
            const sig = await crypto.subtle.sign(
              { name: "ECDSA", hash: "SHA-256" },
              keyPair.privateKey,
              signingInput,
            );
            return headerB64 + "." + payloadB64 + "." + b64url(sig);
          }

          // 2a. GET
          document.getElementById("btn-get").addEventListener("click", async () => {
            const url = new URL("/api/protected", location.origin);
            const proof = await createDPoPProof("GET", url.origin + url.pathname);
            if (!proof) return;
            appendLog("→ GET /api/protected");
            try {
              const res = await fetch(url, { headers: { "DPoP": proof } });
              const body = await res.json();
              appendLog("← " + res.status + " " + JSON.stringify(body, null, 2), res.ok ? "success" : "error");
            } catch (e) { appendLog("Error: " + e.message, "error"); }
          });

          // 2b. POST
          document.getElementById("btn-post").addEventListener("click", async () => {
            const url = new URL("/api/protected", location.origin);
            const proof = await createDPoPProof("POST", url.origin + url.pathname);
            if (!proof) return;
            const data = { name: "Alice", timestamp: new Date().toISOString() };
            appendLog("→ POST /api/protected " + JSON.stringify(data));
            try {
              const res = await fetch(url, {
                method: "POST",
                headers: { "DPoP": proof, "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              const body = await res.json();
              appendLog("← " + res.status + " " + JSON.stringify(body, null, 2), res.ok ? "success" : "error");
            } catch (e) { appendLog("Error: " + e.message, "error"); }
          });

          // 2c. POST (different data)
          document.getElementById("btn-post2").addEventListener("click", async () => {
            const url = new URL("/api/protected", location.origin);
            const proof = await createDPoPProof("POST", url.origin + url.pathname);
            if (!proof) return;
            const data = { name: "Bob", role: "admin", timestamp: new Date().toISOString() };
            appendLog("→ POST /api/protected " + JSON.stringify(data));
            try {
              const res = await fetch(url, {
                method: "POST",
                headers: { "DPoP": proof, "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              const body = await res.json();
              appendLog("← " + res.status + " " + JSON.stringify(body, null, 2), res.ok ? "success" : "error");
            } catch (e) { appendLog("Error: " + e.message, "error"); }
          });

          // Clear
          document.getElementById("btn-clear").addEventListener("click", () => { log.innerHTML = ""; });
        </script>
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
