# Turso (libSQL) サンプル

`GET /api/turso` は Turso にアクセスする最小サンプル。`visits` テーブルに 1
行足して、累計と直近のタイムスタンプを返す。接続情報は環境変数から読む
(`config.ts`):

- `TURSO_DATABASE_URL` — 例 `libsql://<db>-<org>.turso.io`(ローカル開発は
  `file:local.db` でも可)
- `TURSO_AUTH_TOKEN` — アクセストークン

未設定なら 503 (`configured: false`) を返すだけで、アプリ自体は動く。

クライアントは `@libsql/client/web`(fetch/WebSocket のみ、ネイティブ addon
なし)を使うので Deno / Deno Deploy(エッジ)でそのまま動く。

> ローカルで `deno serve -P` する場合、`deno serve` の permission set に Turso
> ホストへの `net` 許可が必要(`reference/server/deno.json` の
> `permissions.default.net` に自分の `*.turso.io` ホストを追加)。Deno Deploy
> ではプラットフォームが付与するので不要。

## `@remix-run/data-table` は Turso と一緒に使えるか

**リモートの Turso とは直接は使えない**(2026-07 時点、
`@remix-run/data-table@0.3.x` / `@remix-run/data-table-sqlite@0.5.x`)。

Remix の SQL ライブラリは 2 段構成:

- `@remix-run/data-table` — DB 非依存のクエリ/リレーション/マイグレーション。
  `createDatabase(adapter)` に `DatabaseAdapter` を渡して使う。
- `@remix-run/data-table-sqlite` — SQLite 用アダプタ
  `createSqliteDatabaseAdapter(db)`。

ポイントは、この sqlite アダプタが要求する `db` が **同期(synchronous)**
インターフェースであること:

```ts
interface SqliteDatabase {
  prepare(sql: string): SqliteStatement; // 同期
  exec(sql: string): unknown; // 同期
}
interface SqliteStatement {
  all(...values: unknown[]): unknown[]; // 同期・配列を返す
  get(...values: unknown[]): unknown; // 同期
  run(...values: unknown[]): SqliteRunResult; // 同期
}
```

これは `node:sqlite`(`DatabaseSync`)や `bun:sqlite` の形。一方、Turso の
`@libsql/client`(`web` / `http` / `ws` / `node` いずれも)は **非同期**
(`execute()` が Promise を返す)なので、この同期インターフェースを満たせず、
アダプタにそのまま渡せない。

### 現実的な選択肢

1. **エッジ / サーバレス(Deno Deploy)で Turso を使う** → 本サンプルのように
   `@libsql/client` を直接使う(非同期)。data-table は使わない。
2. **data-table を使いたい** → 同期ドライバが必要なので、ローカルファイルの
   `node:sqlite` を `createSqliteDatabaseAdapter` に渡す。ただしリモート Turso
   には接続しない(ローカル SQLite になる)。
3. **data-table + Turso を両立させたい** → `libsql`(napi ネイティブ
   パッケージ)の **embedded replica** を使う。ローカルの同期 SQLite ファイルを
   `createSqliteDatabaseAdapter` に渡しつつ、バックグラウンドで Turso
   に同期する。ネイティブ addon と永続ファイルシステムが要るため、 Deno Deploy
   のようなエッジ環境では不可。VM/コンテナ運用なら選択肢。
4. **data-table の `DatabaseAdapter` を自前で非同期実装する** → コア側の
   `DatabaseAdapter.execute()` は `Promise` を返す非同期契約なので、libSQL の
   非同期クライアント向けにフル実装すれば理論上は可能。ただし `compileSql` を
   含む全メソッドの実装が必要で大掛かり(バンドルの同期 sqlite アダプタは
   流用できない)。

まとめると、**Deno Deploy + Turso の組み合わせでは data-table は使わず
`@libsql/client` を直接使うのが素直**。data-table を使いたいなら同期 SQLite
(ローカル or embedded replica)が前提になる。
