/**
 * GET /hydration — component hydration demo using `@remix-run/component`.
 *
 * `<Counter />` is a `clientEntry` (see reference/client/counter.tsx); the
 * server emits its initial HTML + a hydration marker, and the client's
 * `run()` hydrates it in place after loading /counter.js.
 *
 * Rendered as a shell+frame on direct access and as a fragment when loaded
 * through the shell's content frame — hydration markers survive the frame
 * diff and the Counter stays interactive after navigation.
 */

import type { BuildAction } from "@remix-run/fetch-router";
import { Counter } from "../../client/counter.tsx";
import type { routes } from "../routes.ts";
import { renderPage } from "../utils/render.tsx";

export const hydrationAction = {
  handler(context) {
    // `setup` is sent to the component's setup function once per instance.
    // Props (e.g. `label`) are passed to the render function on every update.
    const initialCount = Math.floor(Math.random() * 10);
    const label = `server-rendered at ${new Date().toISOString()}`;

    return renderPage(
      context,
      <main>
        <h1>コンポーネントハイドレーションのサンプル</h1>
        <p>
          <code>@remix-run/component</code> の <code>clientEntry</code>{" "}
          を使った SSR + hydrate。 同じコンポーネント定義 (<code>
            reference/client/counter.tsx
          </code>) を、 サーバーでは直接 JSX ツリーに埋め込んで{" "}
          <code>renderToStream</code> で HTML 化し、 クライアントでは{" "}
          <code>run()</code> が hydration マーカーから動的 import で
          <code>/counter.js</code> を読み込んで in-place にハイドレートします。
        </p>

        <div class="card">
          <h2>Counter (clientEntry)</h2>
          <p>
            初期カウントはサーバーが決定。ボタンはクライアントのハイドレート後に動きます。
          </p>
          <Counter setup={initialCount} label={label} />
          <p style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
            JavaScript 無効でもカウンターの初期値は表示されます (progressive
            enhancement)。
          </p>
        </div>

        <div class="card">
          <h2>仕組み</h2>
          <ol style="padding-left: 1.5rem;">
            <li>
              サーバー:{" "}
              <code>
                renderToStream(&lt;JSX tree with &lt;Counter /&gt;&gt;)
              </code>{" "}
              が HTML と hydration メタデータ (<code>moduleUrl</code>,{" "}
              <code>exportName</code>, <code>props</code>) を出力
            </li>
            <li>
              ブラウザ: <code>/mod.js</code> (= <code>run()</code>{" "}
              を呼ぶ boot) がロードされる
            </li>
            <li>
              <code>run()</code> が hydration マーカーを発見し、<code>
                loadModule("/counter.js", "Counter")
              </code>
              → 動的 import で Counter コンポーネントを取得
            </li>
            <li>
              Counter の render 関数を再実行し、既存 DOM
              にイベントハンドラーを付与 (= hydrate)
            </li>
          </ol>
        </div>
      </main>,
    );
  },
} satisfies BuildAction<"GET", typeof routes.hydration>;
