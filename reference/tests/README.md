# reference/tests — ブラウザ smoke

opt-in のブラウザテスト。デフォルトの `deno task test`
には含まれず、`deno
task test:browser` で明示的に起動する。

## 前提

- `lightpanda` コマンドが PATH にあること
- `reference/public/*.js` が bundle 済であること（`pretest` タスクが
  `deno task
  --cwd ../server bundle` を呼ぶので通常は気にしなくて良い）

### lightpanda のインストール (Linux x86_64)

```bash
mkdir -p ~/.local/bin
curl -L -o ~/.local/bin/lightpanda \
  https://github.com/lightpanda-io/browser/releases/latest/download/lightpanda-x86_64-linux
chmod +x ~/.local/bin/lightpanda
export PATH="$HOME/.local/bin:$PATH"
lightpanda version
```

macOS / Windows はサポート外。詳細は
<https://lightpanda.io/docs/open-source/installation> を参照。

## 実行

```bash
deno task test:browser    # root から
```

## カバー範囲

- `browser_hydration.test.ts` — `/hydration` を開き、`globalThis.__rmxReady`
  が立つまで待ってから `button[aria-label="increment"]` をクリックし、`<output>`
  の数値が +1 される事を assert する。SSR → `/counter.js` 動的 import →
  `handle.update()` のフル経路を exercise する。

## CDP クライアント選定メモ

`npm:puppeteer-core` は接続時に `Audits.enable` や `Page.*` など lightpanda
が未実装の CDP ドメインを呼ぶため使えない（`ProtocolError: UnknownDomain`）。\
本テストは `Target.createTarget` + `Target.attachToTarget` + `Runtime.evaluate`
だけで済む **最小 CDP クライアントを同ファイル内に直書き**しており、lightpanda
が対応する範囲内で完結する。クリック操作も `Input.dispatchMouseEvent` ではなく
`element.click()` を `Runtime.evaluate` 経由で呼ぶ形にしている。

今後 lightpanda 側で Audits/Page/Input が実装されれば puppeteer-core/playwright
に乗り換えて同じシナリオを簡潔に書き直せる。逆に lightpanda
で回らないケース（CSS レイアウト依存、input 系の実イベント、MutationObserver
重依存等）が出てきた場合は、`CdpClient.connect()` の接続先をそのまま Chromium の
CDP に向け替えるだけで移行できる作りにしてある。
