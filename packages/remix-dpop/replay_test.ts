import { assertEquals } from "jsr:@std/assert";
import { InMemoryReplayDetector } from "./replay.ts";

Deno.test("InMemoryReplayDetector — first use returns false", async () => {
  const detector = new InMemoryReplayDetector();
  const result = await detector.seen("jti-1", "tp-1");
  assertEquals(result, false);
  detector.dispose();
});

Deno.test("InMemoryReplayDetector — replay returns true", async () => {
  const detector = new InMemoryReplayDetector();
  const expiresAt = new Date(Date.now() + 60_000);
  await detector.markUsed("jti-2", "tp-2", expiresAt);
  const result = await detector.seen("jti-2", "tp-2");
  assertEquals(result, true);
  detector.dispose();
});

Deno.test("InMemoryReplayDetector — same jti different thumbprint is not replay", async () => {
  const detector = new InMemoryReplayDetector();
  const expiresAt = new Date(Date.now() + 60_000);
  await detector.markUsed("jti-3", "tp-A", expiresAt);
  const result = await detector.seen("jti-3", "tp-B");
  assertEquals(result, false);
  detector.dispose();
});

Deno.test("InMemoryReplayDetector — expired entry is not a replay", async () => {
  const detector = new InMemoryReplayDetector();
  const expiresAt = new Date(Date.now() + 50); // 50ms
  await detector.markUsed("jti-4", "tp-4", expiresAt);

  assertEquals(await detector.seen("jti-4", "tp-4"), true);

  await new Promise((r) => setTimeout(r, 100));
  assertEquals(await detector.seen("jti-4", "tp-4"), false);
  detector.dispose();
});
