/**
 * Pins the browser `resolveFrame` contract that `@remix-run/ui` 0.5 changed.
 *
 * The resolver used to be called as `(src, signal, target)` and is now called
 * as `(src, options)`. Reading the old positional parameters still type-checks
 * against the new signature, so nothing catches the mistake at build time and
 * the app just quietly stops routing to named frames and stops aborting
 * in-flight loads. These assertions do.
 */

// The client workspace compiles against `lib: ["dom", "es2024"]` — browser only,
// on purpose. This test file is the one exception and opts into the Deno globals
// it needs, so the rest of ./ stays honest about what it can reach.
/// <reference lib="deno.ns" />

import { assertEquals, assertStrictEquals } from "@std/assert";

import { FRAME_HEADER, frameRequestInit, resolveFrame } from "./frame.ts";

Deno.test("frameRequestInit: フレーム要求としてマークする", () => {
  const { headers } = frameRequestInit() as { headers: Headers };

  assertEquals(headers.get(FRAME_HEADER), "1");
  assertEquals(headers.get("accept"), "text/html");
  assertEquals(headers.get("rmx-target"), null);
});

Deno.test("frameRequestInit: options.target を rmx-target に渡す", () => {
  const { headers } = frameRequestInit({ target: "content" }) as {
    headers: Headers;
  };

  assertEquals(headers.get("rmx-target"), "content");
});

Deno.test("frameRequestInit: options.signal をそのまま渡す", () => {
  const controller = new AbortController();
  const init = frameRequestInit({ signal: controller.signal });

  assertStrictEquals(init.signal, controller.signal);
});

Deno.test("resolveFrame: フラグメントを取得して本文を返す", async () => {
  // Captured raw: the resolver is handed a same-origin *relative* URL by the
  // runtime, which `new Request()` cannot parse outside a document.
  const seen: { url: unknown; init?: RequestInit }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    seen.push({ url: input, init });
    return Promise.resolve(new Response("<main>fragment</main>"));
  };

  try {
    const body = await resolveFrame("/hydration", { target: "content" });
    const text = typeof body === "string"
      ? body
      : await new Response(body).text();

    assertEquals(text, "<main>fragment</main>");
    assertEquals(seen.length, 1);
    assertEquals(seen[0].url, "/hydration");

    const headers = seen[0].init?.headers as Headers;
    assertEquals(headers.get(FRAME_HEADER), "1");
    assertEquals(headers.get("rmx-target"), "content");
  } finally {
    globalThis.fetch = original;
  }
});
