import { get, post, route } from "@remix-run/fetch-router/routes";

export const routes = route({
  home: get("/"),
  welcome: get("/welcome"),
  hydration: get("/hydration"),
  signin: get("/signin"),
  api: route("api", {
    protectedGet: get("/protected"),
    protectedPost: post("/protected"),
  }),
});
