/**
 * GET /hydration — component hydration demo using @remix-run/component.
 *
 * The entire page is rendered by `renderToStream` from a single JSX tree.
 * `<Counter />` is a `clientEntry` (see ../../client/counter.tsx), so the
 * server emits its initial HTML plus a hydration marker. On the client,
 * `run()` in /hydration.js picks up the marker, dynamically imports
 * /counter.js (the standalone bundle of counter.tsx), and hydrates the
 * DOM in place — preserving the server HTML.
 */

import type { RequestHandler } from "@remix-run/fetch-router";
import { renderToStream } from "@remix-run/component/server";
import { Counter } from "../../client/counter.tsx";

export const hydrationRoute: RequestHandler = (_ctx) => {
  // `setup` is sent to the component's setup function once per instance.
  // Props (e.g. `label`) are passed to the render function on every update.
  const initialCount = Math.floor(Math.random() * 10);
  const label = `server-rendered at ${new Date().toISOString()}`;

  const stream = renderToStream(
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Hydration Demo — @remix-run/component</title>
        <script async type="module" src="/mod.js" />
        <style>
          {`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1a1a1a; }
          h1 { margin-bottom: 1rem; }
          h2 { margin-top: 2rem; margin-bottom: 0.5rem; }
          code { font-family: 'Fira Code', monospace; background: #f5f5f5; padding: 0.1rem 0.3rem; border-radius: 3px; }
          a { color: #0066cc; margin-right: 1rem; }
          button { padding: 0.5rem 1rem; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 1rem; }
          button:hover { background: #e8e8e8; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; }
          nav { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #ddd; }
        `}
        </style>
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/demo">DPoP Demo</a>
          <a href="/hydration">Hydration</a>
        </nav>
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
              ブラウザ: <code>/hydration.js</code> (= <code>run()</code>{" "}
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
      </body>
    </html>,
  );

  return new Response(stream, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};
