/**
 * GET /welcome — landing fragment shown in the shell's content frame.
 *
 * On a direct browser load, the shell is rendered and this same route
 * is re-entered through the frame resolver to provide the fragment.
 */

import type { RequestHandler } from "@remix-run/fetch-router";
import { type Dispatch, renderPage } from "../lib/layout.tsx";

export const createWelcomeRoute =
  (dispatch: Dispatch): RequestHandler => (ctx) =>
    renderPage(
      ctx.request,
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
              <code>packages/dpop-middleware/</code>{" "}
              — DPoP セッション middleware
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
      dispatch,
    );
