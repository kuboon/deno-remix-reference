# deno-remix-reference

Remix + Deno のリファレンス実装。DPoP (RFC 9449) セッションマネージャーを含む。

## 構造

- `packages/remix-dpop/` — DPoP セッションマネージャーパッケージ（Remix middleware として利用可能）
- `reference/` — Remix リファレンス Web アプリ

## 開発

```bash
deno task dev      # reference アプリの開発サーバー起動
deno task test     # パッケージのテスト実行
deno task check    # 型チェック
```

## コーディング規約

- Deno ファースト（Web API 優先、Node.js API は必要最小限）
- TypeScript strict mode
- テストは `Deno.test()` + `@std/assert`
- ファイル名はスネークケース（例: `dpop_test.ts`）
