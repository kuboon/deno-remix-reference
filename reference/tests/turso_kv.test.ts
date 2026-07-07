/**
 * `TursoKvRepo` (@kuboon/kv/turso.ts) against an in-memory libSQL database via
 * `@libsql/client/node` — no network or Turso credentials needed. Mirrors the
 * MemoryKvRepo test cases plus Turso-specifics (shared-table prefix isolation).
 *
 * Lives under `reference/tests` so it runs with `-A` (the native libSQL addon
 * needs FFI), separate from the `-P` package unit tests.
 */

import { assertEquals, assertNotEquals } from "@std/assert";
import { createClient } from "@libsql/client/node";

import { TursoKvRepo } from "../../packages/kv/turso.ts";

Deno.test("entry: set と get で値を保存・取得できる", async () => {
  const client = createClient({ url: ":memory:" });
  const repo = new TursoKvRepo<string>(client, ["test"]);
  await repo.entry("key1").update(() => "hello");
  assertEquals(await repo.entry("key1").get(), "hello");
  client.close();
});

Deno.test("entry: get は存在しないキーに null を返す", async () => {
  const client = createClient({ url: ":memory:" });
  const repo = new TursoKvRepo<string>(client, ["test"]);
  assertEquals(await repo.entry("missing").get(), null);
  client.close();
});

Deno.test("entry: update で値を更新できる", async () => {
  const client = createClient({ url: ":memory:" });
  const repo = new TursoKvRepo<number>(client, ["test"]);
  const entry = repo.entry("counter");
  await entry.update(() => 1);
  const result = await entry.update((n) => (n ?? 0) + 1);
  assertEquals(result.ok, true);
  assertEquals(result.val, 2);
  assertEquals(await entry.get(), 2);
  client.close();
});

Deno.test("entry: 構造化された値を JSON で往復できる", async () => {
  const client = createClient({ url: ":memory:" });
  type Profile = { name: string; tags: string[] };
  const repo = new TursoKvRepo<Profile>(client, ["profile"]);
  const value = { name: "Alice", tags: ["a", "b"] };
  await repo.entry("alice").update(() => value);
  assertEquals(await repo.entry("alice").get(), value);
  client.close();
});

Deno.test("entry: update で null を返すと削除される", async () => {
  const client = createClient({ url: ":memory:" });
  const repo = new TursoKvRepo<string>(client, ["test"]);
  const entry = repo.entry("remove");
  await entry.update(() => "value");
  assertEquals(await entry.get(), "value");
  const del = await entry.update(() => null);
  assertEquals(del.ok, true);
  assertEquals(await entry.get(), null);
  client.close();
});

Deno.test("entry: expireIn 経過後は null を返す", async () => {
  const client = createClient({ url: ":memory:" });
  const repo = new TursoKvRepo<string>(client, ["test"]);
  await repo.entry("expiring").update(() => "temp", { expireIn: 1 });
  await new Promise((r) => setTimeout(r, 10));
  assertEquals(await repo.entry("expiring").get(), null);
  client.close();
});

Deno.test("list: genKey で作成したエントリをイテレートできる", async () => {
  const client = createClient({ url: ":memory:" });
  const repo = new TursoKvRepo<string>(client, ["list-test"]);
  const key = repo.genKey();
  await repo.entry(key).update(() => "item1");
  assertNotEquals(key, null);

  const items: string[] = [];
  for await (const e of repo) {
    const v = await e.get();
    if (v) items.push(v);
  }
  assertEquals(items, ["item1"]);
  client.close();
});

Deno.test("prefix が異なるリポジトリ間で分離される (同一テーブル)", async () => {
  const client = createClient({ url: ":memory:" });
  const repoA = new TursoKvRepo<string>(client, ["a"]);
  const repoB = new TursoKvRepo<string>(client, ["b"]);
  await repoA.entry("x").update(() => "from-a");
  await repoB.entry("x").update(() => "from-b");
  assertEquals(await repoA.entry("x").get(), "from-a");
  assertEquals(await repoB.entry("x").get(), "from-b");

  // repoA のイテレーションに repoB のエントリは現れない。
  const aValues: string[] = [];
  for await (const e of repoA) {
    const v = await e.get();
    if (v) aValues.push(v);
  }
  assertEquals(aValues, ["from-a"]);
  client.close();
});
