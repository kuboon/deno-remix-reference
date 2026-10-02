import { css, type Handle } from "@remix-run/ui";

import { ClickCounter } from "../islands/click_counter.tsx";
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
        <code>@remix-run/ui</code> の <code>clientEntry</code>{" "}
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
        <Counter initialCount={initialCount} label={label} />
        <p mix={noteStyle}>
          JavaScript 無効でもカウンターの初期値は表示されます (progressive
          enhancement)。
        </p>
      </section>

      <section mix={cardStyle}>
        <h2>Two islands, one shared module</h2>
        <p>
          Both controls below are server-rendered, then hydrated. They are{" "}
          <em>separate browser entrypoints</em>{" "}
          that never talk to each other. Each one imports the same click store,
          and the running total keeps up because the bundler emitted that store
          once, into a chunk they share. Compile the two entries independently
          and each gets a private copy — the total would sit at zero forever.
        </p>
        <div mix={demoRowStyle}>
          <ClickCounter label="Left" start={0} />
          <ClickCounter label="Right" start={0} />
          <Total label="Shared total" />
        </div>
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
