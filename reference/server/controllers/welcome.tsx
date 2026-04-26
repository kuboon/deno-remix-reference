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
      <main class="mx-auto w-full max-w-3xl p-8 space-y-6">
        <div class="hero bg-base-200 rounded-box">
          <div class="hero-content text-center">
            <div>
              <h1 class="text-3xl font-bold">
                Remix v3 + DPoP Session Manager
              </h1>
              <p class="py-4">
                Deno + Remix v3 (fetch-router) リファレンス実装。
              </p>
            </div>
          </div>
        </div>

        <div class="card card-border bg-base-100">
          <div class="card-body">
            <h2 class="card-title">構成</h2>
            <ul class="list-disc pl-6 space-y-1">
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
        </div>

        <div class="card card-border bg-base-100">
          <div class="card-body">
            <h2 class="card-title">API エンドポイント</h2>
            <ul class="list-disc pl-6 space-y-1">
              <li>
                <span class="badge badge-success badge-sm mr-2">GET</span>
                <code>/api/protected</code> — DPoP 保護。セッション情報を返す
              </li>
              <li>
                <span class="badge badge-warning badge-sm mr-2">POST</span>
                <code>/api/protected</code>{" "}
                — DPoP 保護。セッションにデータを書き込む
              </li>
            </ul>
          </div>
        </div>
      </main>,
    );
  },
} satisfies BuildAction<"GET", typeof routes.welcome>;
