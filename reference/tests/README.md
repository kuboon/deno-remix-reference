# reference/tests — ブラウザ smoke

opt-in のブラウザテスト。デフォルトの `deno task test`
には含まれず、`deno
task test:browser` で明示的に起動する。 lightpanda
バイナリは npm:@lightpanda/browser の postinstall scriptでビルドされる。

## 前提

- `reference/bundled/*.js` が bundle 済であること（`pretest` タスクが
  `deno task
  --cwd ../server bundle` を呼ぶので通常は気にしなくて良い）

## 実行

```bash
deno task test:browser    # root から
```

## カバー範囲

- `browser_hydration.test.ts` — `/hydration` を開き、`globalThis.__rmxReady`
  が立つまで待ってから `button[aria-label="increment"]` をクリックし、`<output>`
  の数値が +1 される事を assert する。SSR → `/counter.js` 動的 import →
  `handle.update()` のフル経路を exercise する。
