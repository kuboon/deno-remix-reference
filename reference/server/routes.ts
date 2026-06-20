import { get, post, route } from "@remix-run/fetch-router/routes";

export const routes = route({
  home: get("/"),
  hydration: get("/hydration"),
  signin: get("/signin"),
  api: route("api", {
    protectedGet: get("/protected"),
    protectedPost: post("/protected"),
  }),
});
