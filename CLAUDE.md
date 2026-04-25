# deno-remix-reference

Remix v3 + Deno のリファレンス実装。DPoP (RFC 9449)
セッションマネージャーを含む。

## 構造

- `packages/kv/` — `KvRepo` 抽象 (memory / Deno KV / Cloudflare KV)
- `packages/session-storage-kv/` — `@remix-run/session` の `SessionStorage` を
  `KvRepo` で実装。
- `packages/remix-dpop-session-middleware/` — DPoP セッション middleware (Remix
  v3 fetch-router 用)。`context.get(DpopSession)` でアクセスでき、
  `@remix-run/session` の `Session` と共存可能。DPoP proof 生成・検証は
  [jsr:@kuboon/dpop](https://jsr.io/@kuboon/dpop) を利用。
- `reference/` — Remix v3 リファレンス Web アプリ
  - `/signin` — id.kbn.one を IdP として使うサインインフローのサンプル

## 環境変数

- `IDP_ORIGIN` — 外部 IdP の origin (例: `http://localhost:8000`)。 `/signin`
  ページが `${IDP_ORIGIN}/authorize` へ DPoP thumbprint と redirect_uri
  を付けて遷移し、戻った後 `${IDP_ORIGIN}/session` で userId を取得する。

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
