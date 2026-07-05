/**
 * `withScheme` normalizes the RP/IdP origins used in the `private_key_jwt`
 * client assertion (its `clientId`/`iss`/`sub` and `aud`). A `RP_ORIGIN`
 * configured without a scheme must still produce an absolute origin the IdP
 * can whitelist and fetch JWKS from.
 */

import { assertEquals } from "@std/assert";
import { withScheme } from "./config.ts";

Deno.test("withScheme promotes a bare host to https://", () => {
  assertEquals(withScheme("rp.example.com"), "https://rp.example.com");
  assertEquals(
    withScheme("rp.example.com:8443"),
    "https://rp.example.com:8443",
  );
});

Deno.test("withScheme keeps an explicit scheme as-is", () => {
  assertEquals(
    withScheme("https://rp.example.com"),
    "https://rp.example.com",
  );
  assertEquals(withScheme("http://localhost:3000"), "http://localhost:3000");
  assertEquals(withScheme("HTTPS://rp.example.com"), "HTTPS://rp.example.com");
});

Deno.test("withScheme leaves an empty value empty", () => {
  assertEquals(withScheme(""), "");
});
