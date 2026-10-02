import { css, type Handle } from "@remix-run/component";

import { Counter } from "../islands/counter.tsx";
import { Total } from "../islands/total.tsx";
import { cardStyle } from "../theme.ts";
import { color } from "../tokens.ts";

export const title = "Hydration — Remix3 on Deno";
export const description = "clientEntry を使った SSR + hydrate のサンプル。";

/** This page places a client entry, so the shell boots the runtime for it. */
export const hydrate = true;

export default function Hydration(_handle: Handle) {
  // `initialCount` seeds the component state once during setup. On the static
  // build this is decided at build time; on Deno Deploy it is per request.
  const initialCount = Math.floor(Math.random() * 10);
  const label = `rendered at ${new Date().toISOString()}`;

  return () => (
    <>
      <h1>コンポーネントハイドレーションのサンプル</h1>
      <p>
        <code>@remix-run/component</code> の <code>clientEntry</code>{" "}
        を使った SSR + hydrate。同じコンポーネント定義 (
        <code>web/client/islands/counter.tsx</code>) を、サーバーでは直接 JSX
        ツリーに埋め込んで <code>renderToStream</code>{" "}
        で HTML 化し、クライアントでは <code>run()</code>{" "}
        が hydration マーカーから動的 import で chunk を読み込み、in-place
        にハイドレートします。
      </p>

      <section mix={cardStyle}>
        <h2>Counter (clientEntry)</h2>
        <p>
          初期カウントはサーバー (静的ビルドではビルド時)
          が決定。ボタンはクライアントのハイドレート後に動きます。
        </p>
        <div mix={demoRowStyle}>
          <Counter initialCount={initialCount} label="Left" />
          <Counter initialCount={0} label="Right" />
          <Total label="Shared total" />
        </div>
        <p mix={noteStyle}>
          JavaScript 無効でもカウンターの初期値は表示されます (progressive
          enhancement)。
        </p>
        <p>
          3 つとも<em>
            別々のブラウザ entrypoint
          </em>で、互いに直接は通信しません。 Counter は同じ click store を
          import し、Total はそれを購読しているだけです。bundler がその store
          を共有 chunk に 1 つだけ出力するので、合計が追従します。entry
          ごとに別々にコンパイルすると store が複製され、合計はずっと 0
          のままになります。
        </p>
        <p mix={noteStyle}>{label}</p>
      </section>

      <section mix={cardStyle}>
        <h2>仕組み</h2>
        <ol mix={listStyle}>
          <li>
            サーバー: <code>renderToStream</code>{" "}
            が HTML と hydration メタデータ (<code>moduleUrl</code>,{" "}
            <code>exportName</code>, <code>props</code>) を出力
          </li>
          <li>
            ブラウザ: shell が読み込む <code>hydration.ts</code> が{" "}
            <code>run()</code> を呼ぶ
          </li>
          <li>
            <code>run()</code> が hydration マーカーを発見し、
            <code>loadModule</code> → 動的 import で Counter を取得
          </li>
          <li>
            Counter の render 関数を再実行し、既存 DOM
            にイベントハンドラーを付与 (= hydrate)
          </li>
        </ol>
      </section>
    </>
  );
}

const demoRowStyle = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "0.75rem",
});

const noteStyle = css({ color: color.muted, fontSize: "0.9rem" });

const listStyle = css({
  paddingLeft: "1.1rem",
  "& li": { marginBlock: "0.4rem" },
});
