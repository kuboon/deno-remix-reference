/**
 * GET /signin — sign-in via id.kbn.one (IdP).
 *
 * Rendered as a shell+frame on direct access and as a fragment when loaded
 * via the shell's content frame. The inline `/signin.js` script picks up
 * the `<meta name="idp-origin">` tag and drives the IdP probe/redirect flow.
 */

import type { RequestHandler } from "@remix-run/fetch-router";
import { type Dispatch, renderPage } from "../lib/layout.tsx";

const idpOrigin = "https://id.kbn.one";

export const createSigninRoute = (dispatch: Dispatch): RequestHandler =>
  (ctx) =>
    renderPage(
      ctx.request,
      <main>
        <meta name="idp-origin" content={idpOrigin} />
        <h1>id.kbn.one でサインイン</h1>
        <p>
          このページは外部 IdP (id.kbn.one) を使ったサインイン UX
          のサンプルです。 DPoP 鍵を生成し、IdP に thumbprint を bind
          してもらうことで Cookie レスにセッションを共有します。
        </p>

        <div class="card">
          <h2>状態</h2>
          <p id="status"></p>
          <p id="user-info">…</p>
          <p>
            このブラウザの DPoP thumbprint: <code id="thumbprint">…</code>
          </p>
          <div style="margin-top: 1rem;">
            <button type="button" id="signin" hidden>
              id.kbn.one でサインイン
            </button>
            <button type="button" id="signout" hidden>サインアウト</button>
          </div>
        </div>

        <div class="card">
          <h2>仕組み</h2>
          <ol style="padding-left: 1.5rem;">
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

        <script type="module" src="/signin.js"></script>
      </main>,
      dispatch,
    );
