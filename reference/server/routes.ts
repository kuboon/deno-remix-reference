import { get, post, route } from "@remix-run/fetch-router/routes";

export const routes = route({
  home: get("/"),
  hydration: get("/hydration"),
  my: get("/my"),
  // RP public JWKS — lets the IdP verify our `private_key_jwt` assertions.
  jwks: get("/.well-known/jwks.json"),
  // Server-initiated push fan-out (delegates to the IdP). Not DPoP-protected;
  // kept out of the `api` group so it doesn't inherit its DPoP middleware.
  notify: post("/api/notify"),
  // Turso (libSQL) + @remix-run/data-table sample.
  turso: get("/api/turso"),
  api: route("api", {
    protectedGet: get("/protected"),
    protectedPost: post("/protected"),
  }),
});
