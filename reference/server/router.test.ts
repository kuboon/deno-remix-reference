import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import router from "./router.ts";

const FRAME_HEADERS = { "rmx-frame": "1", accept: "text/html" };

Deno.test("GET / returns shell HTML with frame-target nav", async () => {
  const res = await router.fetch(new Request("http://x/"));
  assertEquals(res.status, 200);
  assertStringIncludes(res.headers.get("content-type") ?? "", "text/html");
  const html = await res.text();
  assertStringIncludes(html, "<!DOCTYPE html>");
  assertStringIncludes(html, 'rmx-target="content"');
});

Deno.test("GET / with rmx-frame returns landing fragment", async () => {
  const res = await router.fetch(
    new Request("http://x/", { headers: FRAME_HEADERS }),
  );
  assertEquals(res.status, 200);
  const html = await res.text();
  assert(html.trimStart().startsWith("<main"), `got: ${html.slice(0, 80)}`);
  assertStringIncludes(html, "Remix v3 + DPoP Session Manager");
  assert(!html.includes("<!DOCTYPE html>"));
});

Deno.test("GET /hydration fragment includes clientEntry marker", async () => {
  const res = await router.fetch(
    new Request("http://x/hydration", { headers: FRAME_HEADERS }),
  );
  assertEquals(res.status, 200);
  const html = await res.text();
  assertStringIncludes(html, "/counter.js");
  assertStringIncludes(html, "Counter");
  assertStringIncludes(html, 'aria-label="increment"');
});

Deno.test("GET /my fragment embeds idp-origin meta", async () => {
  const res = await router.fetch(
    new Request("http://x/my", { headers: FRAME_HEADERS }),
  );
  assertEquals(res.status, 200);
  const html = await res.text();
  assertStringIncludes(html, '<meta name="idp-origin"');
  assertStringIncludes(html, "https://id.kbn.one");
});

Deno.test("GET /api/protected without DPoP proof is rejected", async () => {
  const res = await router.fetch(new Request("http://x/api/protected"));
  assert(
    res.status === 401 || res.status === 400,
    `expected 400 or 401, got ${res.status}`,
  );
  await res.body?.cancel();
});

Deno.test("GET /api/turso reports unconfigured without Turso env", async () => {
  // No TURSO_DATABASE_URL in the test environment — the sample degrades to a
  // 503 instead of attempting a connection.
  const res = await router.fetch(new Request("http://x/api/turso"));
  assertEquals(res.status, 503);
  const body = await res.json() as { configured?: boolean };
  assertEquals(body.configured, false);
});
