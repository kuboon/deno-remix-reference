import { assertEquals } from "jsr:@std/assert";
import { InMemorySessionStore } from "./session.ts";

Deno.test("InMemorySessionStore — get returns null for unknown key", async () => {
  const store = new InMemorySessionStore();
  const result = await store.get("unknown-thumbprint");
  assertEquals(result, null);
  store.dispose();
});

Deno.test("InMemorySessionStore — set and get round-trips", async () => {
  const store = new InMemorySessionStore();
  const data = { userId: "alice", role: "admin" };
  await store.set("tp-123", data);
  const result = await store.get("tp-123");
  assertEquals(result, { userId: "alice", role: "admin" });
  store.dispose();
});

Deno.test("InMemorySessionStore — delete removes entry", async () => {
  const store = new InMemorySessionStore();
  await store.set("tp-del", { value: 1 });
  assertEquals(await store.get("tp-del"), { value: 1 });
  await store.delete("tp-del");
  assertEquals(await store.get("tp-del"), null);
  store.dispose();
});

Deno.test("InMemorySessionStore — expired entry returns null", async () => {
  const store = new InMemorySessionStore(50); // 50ms TTL
  await store.set("tp-exp", { value: "short-lived" });
  assertEquals(await store.get("tp-exp"), { value: "short-lived" });

  // Wait for TTL to expire
  await new Promise((r) => setTimeout(r, 100));
  assertEquals(await store.get("tp-exp"), null);
  store.dispose();
});

Deno.test("InMemorySessionStore — custom TTL per entry", async () => {
  const store = new InMemorySessionStore(60_000); // default 60s
  await store.set("tp-custom", { v: 1 }, { ttl: 50 }); // 50ms TTL

  assertEquals(await store.get("tp-custom"), { v: 1 });
  await new Promise((r) => setTimeout(r, 100));
  assertEquals(await store.get("tp-custom"), null);
  store.dispose();
});
