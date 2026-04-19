/**
 * GET /signin — sign-in via id.kbn.one (IdP).
 *
 * Loads /signin.js which:
 *  - reads the IdP origin from <meta name="idp-origin">
 *  - probes the IdP /session endpoint with our DPoP key
 *  - if not signed in, offers a button that redirects to ${IDP}/authorize
 */

import { html } from "@remix-run/html-template";
import type { RequestHandler } from "@remix-run/fetch-router";
import { htmlResponse, layout } from "../lib/layout.ts";

const idpOrigin = Deno.env.get("IDP_ORIGIN")?.trim() ?? "";

export const signinRoute: RequestHandler = (_ctx) => {
  return htmlResponse(layout(
    "Sign in",
    html`
      <meta name="idp-origin" content="${idpOrigin}" />
      <h1>id.kbn.one でサインイン</h1>
      <p>
        このページは外部 IdP (id.kbn.one) を使ったサインイン UX のサンプルです。 DPoP
        鍵を生成し、IdP に thumbprint を bind してもらうことで Cookie
        レスにセッションを共有します。
      </p>

      <div class="card">
        <h2>状態</h2>
        <p id="status"></p>
        <p id="user-info">…</p>
        <p>このブラウザの DPoP thumbprint: <code id="thumbprint">…</code></p>
        <div style="margin-top: 1rem;">
          <button type="button" id="signin" hidden>id.kbn.one でサインイン</button>
          <button type="button" id="signout" hidden>サインアウト</button>
        </div>
      </div>

      <div class="card">
        <h2>仕組み</h2>
        <ol style="padding-left: 1.5rem;">
          <li>このページが <code>thumbprint</code> を計算</li>
          <li>
            「サインイン」で <code>${idpOrigin}/authorize?dpop_jkt&redirect_uri</code>
            へ遷移
          </li>
          <li>
            IdP がパスキー認証 → <code>POST /bind_session</code> でこの thumbprint に
            userId を紐付け
          </li>
          <li>
            戻ってきたページで <code>fetchDpop GET ${idpOrigin}/session</code> が
            userId を返す
          </li>
        </ol>
      </div>

      <script type="module" src="/signin.js"></script>
    `,
  ));
};
