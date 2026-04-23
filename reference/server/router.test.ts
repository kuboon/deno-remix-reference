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
  assertStringIncludes(html, "/welcome");
});

Deno.test("GET /welcome with rmx-frame returns fragment", async () => {
  const res = await router.fetch(
    new Request("http://x/welcome", { headers: FRAME_HEADERS }),
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

Deno.test("GET /signin fragment embeds idp-origin meta", async () => {
  const res = await router.fetch(
    new Request("http://x/signin", { headers: FRAME_HEADERS }),
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
