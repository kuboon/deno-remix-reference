# deno-remix-reference

Remix v3 + Deno のリファレンス実装。DPoP (RFC 9449)
セッションマネージャーを含む。

## 構造

- `KvRepo` 抽象は [jsr:@kuboon/kv](https://jsr.io/@kuboon/kv) を利用 (memory /
  Deno KV / Turso libSQL)。
- `packages/session-storage-kv/` — `@remix-run/session` の `SessionStorage` を
  `KvRepo` で実装。
- `packages/remix-dpop-session-middleware/` — DPoP セッション middleware (Remix
  v3 fetch-router 用)。`context.get(DpopSession)` でアクセスでき、
  `@remix-run/session` の `Session` と共存可能。DPoP proof 生成・検証は
  [jsr:@kuboon/dpop](https://jsr.io/@kuboon/dpop) を利用。
- `reference/` — Remix v3 リファレンス Web アプリ
  - `/my` — id.kbn.one を IdP として使うサインインフロー +
    プッシュ通知のサンプル

## プッシュ通知 (id.kbn.one 連携)

id.kbn.one を Web Push のバックエンドとして使う最小構成。購読情報は IdP
が保持し、RP (このアプリ) は購読 UI と送信トリガーだけを持つ。

- ブラウザ側 (`reference/client/lib/push/`, `push_card.tsx`, `sw.js`):
  - `/sw.js` をこのオリジンに登録し push を受信。
  - 購読の取得/登録/改名/削除/テストは DPoP-bound fetch で IdP の
    `${IDP_ORIGIN}/push/*` を直接叩く (cross-origin)。VAPID 公開鍵も IdP
    のもの。
- サーバ側 (`reference/server/lib/push/client.ts`, `lib/signing-key.ts`):
  - `POST /api/notify` がサーバ起点で通知を送る。RP は ES256 鍵で
    `private_key_jwt` クライアントアサーション ([RFC 7521]/[RFC 7523]) を作り、
    IdP の `POST /rp/notifications` へ送信する。
  - `GET /.well-known/jwks.json` で RP の公開鍵を配布し、IdP
    がアサーションを検証 する (共通鍵不要。IdP は RP の JWKS を取得するだけ)。
  - RP の `clientId` はこのアプリの origin (`RP_ORIGIN`) で、IdP の
    `AUTHORIZE_WHITELIST` に含まれている必要がある。

[RFC 7521]: https://www.rfc-editor.org/rfc/rfc7521
[RFC 7523]: https://www.rfc-editor.org/rfc/rfc7523

## 環境変数

env アクセスは `reference/server/config.ts` に集約し、ホスト非依存にしてある。
`loadConfig(env)` が env レコードから型付き `Config` を作り、`getConfig()` が
ホストに応じて env を自前で取得する (配線不要): Deno は `Deno.env`、Cloudflare
Workers は `cloudflare:workers` の `env`。後者は動的 `import()` なので、その
モジュールを持たない Deno はロードで落ちずフォールバックできる (静的 import は
Deno で catch 不能なエラーになる)。`getConfig()` は async。

- `IDP_ORIGIN` — 外部 IdP の origin (例: `http://localhost:8000`)。 `/my`
  ページが `${IDP_ORIGIN}/authorize` へ DPoP thumbprint と redirect_uri
  を付けて遷移し、戻った後 `${IDP_ORIGIN}/session` で userId を取得する。
- `RP_ORIGIN` — このアプリの公開 origin。`POST /api/notify` のクライアント
  アサーションの `clientId`/`iss`/`sub` に使う。IdP の `AUTHORIZE_WHITELIST`
  に登録が必要。未設定だと送信時にエラーになる。
- `RP_SIGNING_KEY_JWK` — 任意。ES256 秘密鍵 (JWK JSON)。未設定ならプロセス毎に
  生成
  (開発用)。本番では固定鍵を設定し、再起動で鍵がローテートしないようにする。
- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` — `GET /api/turso` サンプル用の
  Turso (libSQL) 接続。未設定なら 503 を返すのみ。

## Turso (libSQL) + data-table サンプル

`GET /api/turso` が `@remix-run/data-table` のリレーショナル API で Turso に
アクセスし、`visits` を記録して累計を返す。Turso の `@libsql/client` は非同期
なので、公式の同期 SQLite アダプタではなく非同期アダプタ
[`@kuboon/remix-data-table-sqlite-turso`](https://jsr.io/@kuboon/remix-data-table-sqlite-turso)
を使う。クライアントは edge 対応の `@libsql/client/web`。詳細は
`reference/server/lib/turso/README.md`。

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
