/**
 * GET / — landing page introducing the project.
 */

import type { RequestHandler } from "@remix-run/fetch-router";
import { renderLayout } from "../lib/layout.tsx";

export const indexRoute: RequestHandler = (_ctx) => {
  return renderLayout(
    "Home",
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
            <code>packages/dpop-middleware/</code> — DPoP セッション middleware
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

      <p style="margin-top: 2rem;">
        <a href="/demo">→ インタラクティブデモを試す</a>
      </p>
    </main>,
  );
};
