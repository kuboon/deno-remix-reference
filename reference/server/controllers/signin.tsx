/**
 * GET /signin — sign-in via id.kbn.one (IdP).
 *
 * Rendered as a shell+frame on direct access and as a fragment when loaded
 * via the shell's content frame. The inline `/signin.js` script picks up
 * the `<meta name="idp-origin">` tag and drives the IdP probe/redirect flow.
 */

import type { BuildAction } from "@remix-run/fetch-router";
import type { routes } from "../routes.ts";
import { renderPage } from "../utils/render.tsx";

const idpOrigin = "https://id.kbn.one";

export const signinAction = {
  handler(context) {
    return renderPage(
      context,
      <main class="mx-auto w-full max-w-3xl p-8 space-y-6">
        <meta name="idp-origin" content={idpOrigin} />
        <h1 class="text-3xl font-bold">id.kbn.one でサインイン</h1>
        <p>
          このページは外部 IdP (id.kbn.one) を使ったサインイン UX
          のサンプルです。 DPoP 鍵を生成し、IdP に thumbprint を bind
          してもらうことで Cookie レスにセッションを共有します。
        </p>

        <div class="card card-border bg-base-100">
          <div class="card-body">
            <h2 class="card-title">状態</h2>
            <div role="alert" class="alert alert-info alert-soft">
              <span id="status"></span>
            </div>
            <p id="user-info" class="mt-2">…</p>
            <p>
              このブラウザの DPoP thumbprint: <code id="thumbprint">…</code>
            </p>
            <div class="card-actions mt-2">
              <button type="button" id="signin" class="btn btn-primary" hidden>
                id.kbn.one でサインイン
              </button>
              <button
                type="button"
                id="signout"
                class="btn btn-outline"
                hidden
              >
                サインアウト
              </button>
            </div>
          </div>
        </div>

        <div class="card card-border bg-base-100">
          <div class="card-body">
            <h2 class="card-title">仕組み</h2>
            <ol class="list-decimal pl-6 space-y-1">
              <li>
                このページが <code>thumbprint</code> を計算
              </li>
              <li>
                「サインイン」で{" "}
                <code>${idpOrigin}/authorize?dpop_jkt&redirect_uri</code>
                へ遷移
              </li>
              <li>
                IdP がパスキー認証 → <code>POST /bind_session</code>{" "}
                でこの thumbprint に userId を紐付け
              </li>
              <li>
                戻ってきたページで{" "}
                <code>fetchDpop GET ${idpOrigin}/session</code> が userId を返す
              </li>
            </ol>
          </div>
        </div>

        <script type="module" src="/signin.js"></script>
      </main>,
    );
  },
} satisfies BuildAction<"GET", typeof routes.signin>;
