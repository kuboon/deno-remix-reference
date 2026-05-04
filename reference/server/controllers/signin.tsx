/**
 * GET /signin — sign-in via id.kbn.one (IdP).
 *
 * Rendered as a shell+frame on direct access and as a fragment when loaded
 * via the shell's content frame. The status card is a `clientEntry`
 * (`SignInCard` in reference/client/signin_card.tsx); the server emits its
 * initial HTML + a hydration marker, and the shell's `run()` hydrates it
 * after navigation — this works for both direct loads and frame swaps,
 * unlike a `<script type="module">` tag that wouldn't execute on swap.
 */

import type { BuildAction } from "@remix-run/fetch-router";
import { SignInCard } from "../../client/signin_card.tsx";
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

        <SignInCard idpOrigin={idpOrigin} />

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
      </main>,
    );
  },
} satisfies BuildAction<"GET", typeof routes.signin>;
