/**
 * GET /welcome — landing fragment shown in the shell's content frame.
 *
 * On a direct browser load, the shell is rendered and this same route is
 * re-entered through the frame resolver to provide the fragment.
 */

import type { BuildAction } from "@remix-run/fetch-router";
import type { routes } from "../routes.ts";
import { renderPage } from "../utils/render.tsx";

export const welcomeAction = {
  handler(context) {
    return renderPage(
      context,
      <main>
        <h1>Remix v3 + DPoP Session Manager</h1>
        <p>Deno + Remix v3 (fetch-router) リファレンス実装。</p>

        <div class="card">
          <h2>構成</h2>
          <ul>
            <li>
              <code>packages/dpop/</code> — DPoP proof 生成・検証ライブラリ
            </li>
            <li>
              <code>packages/remix-dpop-session-middleware/</code>{" "}
              — DPoP セッション middleware (Remix v3 fetch-router)
            </li>
            <li>
              <code>packages/session-storage-kv/</code>{" "}
              — Remix v3 SessionStorage を KvRepo で実装
            </li>
            <li>
              <code>reference/</code> — この Web アプリ
            </li>
          </ul>
        </div>

        <div class="card">
          <h2>API エンドポイント</h2>
          <ul>
            <li>
              <code>GET /api/protected</code> — DPoP 保護。セッション情報を返す
            </li>
            <li>
              <code>POST /api/protected</code>{" "}
              — DPoP 保護。セッションにデータを書き込む
            </li>
          </ul>
        </div>
      </main>,
    );
  },
} satisfies BuildAction<"GET", typeof routes.welcome>;
