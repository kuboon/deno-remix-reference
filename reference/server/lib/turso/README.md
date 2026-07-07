# Turso (libSQL) + data-table サンプル

`GET /api/turso` は Turso に `@remix-run/data-table` のリレーショナル API で
アクセスするサンプル。`visits` テーブルに 1 行足して、累計と直近のタイムスタンプ
を返す。

## 構成

- `@remix-run/data-table` — DB 非依存のクエリ/リレーション API。
- `@kuboon/remix-data-table-sqlite-turso` — data-table の **非同期** SQLite
  アダプタ(`createTursoDatabaseAdapter`)。Turso の `@libsql/client` は全ビルドが
  非同期なので、同期前提の公式 `@remix-run/data-table-sqlite` では駆動できない。
  このアダプタが各ドライバ呼び出しを await するので Turso を扱える。
- `@libsql/client` — libSQL クライアント。アプリ側は edge 対応の
  `@libsql/client/web`(fetch/WebSocket のみ、ネイティブ addon 無し)を使うので
  Deno Deploy でそのまま動く。

```ts
import { createClient } from "@libsql/client/web";
import { createDatabase } from "@remix-run/data-table";
import { createTursoDatabaseAdapter } from "@kuboon/remix-data-table-sqlite-turso";

const client = createClient({ url, authToken });
const db = createDatabase(createTursoDatabaseAdapter(client));
// db.create(table, {...}) / db.count(table) / db.findMany(table, {...}) …
```

`lib/turso/db.ts` は `createTursoDatabase(client)`(任意の libSQL クライアントを
受け取るコア)と、環境変数から web クライアントを組み立てる `getTursoDb()` を
公開する。

## 環境変数(`config.ts`)

- `TURSO_DATABASE_URL` — 例 `libsql://<db>-<org>.turso.io`
- `TURSO_AUTH_TOKEN` — アクセストークン

未設定なら 503 (`configured: false`) を返すだけで、アプリ自体は動く。

> ローカルで `deno serve -P` する場合、Turso ホストへの `net` 許可が必要
> (`reference/server/deno.json` の `permissions.default.net` に自分の
> `*.turso.io` ホストを追加)。Deno Deploy
> ではプラットフォームが付与するので不要。

## テスト

`reference/tests/turso_data_table.test.ts` が `@libsql/client/node` の
**インメモリ**(`:memory:`)DB に対して `createTursoDatabase` を実行し、 create /
count / findMany を検証する(ネットワークや Turso 認証情報は不要)。 ネイティブ
addon が FFI を使うため `-A` で走る `deno task test:browser` に含めている(`-P`
のユニットテストとは分離)。

## 他のデプロイ形態

- **同期 SQLite**(Node の `node:sqlite` / Bun の `bun:sqlite`)を使う場合は、
  この非同期アダプタではなく公式の `@remix-run/data-table-sqlite` を使う。
- **embedded replica**(ローカル同期ファイル + バックグラウンド同期)を使いたい
  場合は `@libsql/client` のローカル/replica クライアントをこのアダプタに渡せる
  (ネイティブ addon + 永続ファイルシステムが要るため Deno Deploy のエッジでは
  不可)。
