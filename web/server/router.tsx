/**
 * The app, wired by hand.
 *
 * Route definitions live in `client/routes.ts` and this file maps them to what answers them — the
 * shape a Remix app has. `router.map(routes, controller)` is the whole of the mapping, and a
 * controller has to name an action for every route in the map it owns: leave one out and the
 * router throws while it is being built, rather than answering a route with nothing.
 *
 * What is exported is a plain `@remix-run/fetch-router` router, and it is deployed two ways from
 * this one file:
 *
 * - **Deno Deploy** runs `deno serve router.tsx`: the pages *and* the server-only routes (`/api/*`,
 *   `/.well-known/jwks.json`) answer live.
 * - **GitHub Pages** is `@remix-kbn/ssg` crawling this same object with `fetch()` and writing each
 *   response to disk. It starts from `entryPoints` and follows links, and nothing links to the
 *   server-only routes, so `/api/*` is never generated.
 */

import {
  createController,
  createRouter,
  type RouterContext,
} from "@remix-run/fetch-router";
import { render } from "@remix-run/render-middleware";
import { createFileTree, githubPages } from "@remix-kbn/ssg/site";
import type { FileServerBehavior } from "@remix-kbn/ssg/site";

import { assets, assetsPath } from "./assets.ts";
import { clientRuntime } from "./runtime.ts";
import { ogImage, ogPaths, serveOgImage } from "./og/mod.ts";
import { base } from "../client/base.ts";
import { Layout, type PageModule } from "../client/layout.tsx";
import { routes } from "../client/routes.ts";

import * as Home from "../client/pages/index.tsx";
import * as Hydration from "../client/pages/hydration.tsx";
import * as My from "../client/pages/my.tsx";

import { apiController } from "./controllers/api/controller.ts";
import { notifyAction } from "./controllers/api/notify.ts";
import { tursoAction } from "./controllers/api/turso.ts";
import { jwksAction } from "./controllers/well_known.ts";

/** Deploy path prefix. The build strips it back off when writing, so output lands at the root. */
export { base };

/** Where the static build deploys. The build writes the file this rule would serve. */
export const fileServer: FileServerBehavior = githubPages();

/**
 * Renders a page module into the shell.
 *
 * The route comes in alongside the module because the page's own path is what its social card is
 * registered under — the card is drawn from the same `title` and `description` the `<head>` gets.
 */
function pageAction(route: { href(): string }, page: PageModule) {
  const image = ogImage(route.href(), page);
  const Page = page.default;

  return (context: AppContext): Response =>
    context.render(
      <Layout
        title={page.title}
        description={page.description}
        image={image}
        script={page.hydrate ? clientRuntime : null}
      >
        <Page />
      </Layout>,
    );
}

/** The files under `client/static/`, served verbatim at their own names. */
const staticFiles = await createFileTree({
  rootDir: `${import.meta.dirname}/../client/static`,
  basePath: `${base}/static`,
  cacheControl: "public, max-age=3600",
});

/**
 * The service worker, from `client/sw.js`.
 *
 * It is a route of its own rather than a file under `static/` because a worker's scope is the
 * directory it is served from: `${base}/static/sw.js` could only control `${base}/static/`.
 */
const serviceWorker = await Deno.readTextFile(
  new URL("../client/sw.js", import.meta.url),
);

/** `render({ assets })` puts `context.render(node)` on every request. */
const router = createRouter({ middleware: [render({ assets })] });

/** The request context those middlewares produce — `context.render`, in practice. */
export type AppContext = RouterContext<typeof router>;

declare module "@remix-run/fetch-router" {
  interface RouterTypes {
    context: AppContext;
  }
}

/**
 * The direct routes at the top of the map: the pages, and the JWKS document.
 *
 * `routes.api` is a map, so it is mapped separately below.
 */
const top = createController(routes, {
  actions: {
    home: pageAction(routes.home, Home),
    hydration: pageAction(routes.hydration, Hydration),
    my: pageAction(routes.my, My),
    jwks: jwksAction,
  },
});

/**
 * The server-only API. Static builds never reach it — see the header.
 *
 * `routes.api.protected` is a map of its own, owned by `apiController`, because the DPoP
 * middleware belongs to those two routes and not to `notify`/`turso`.
 */
const api = createController(routes.api, {
  actions: {
    notify: notifyAction,
    turso: tursoAction,
  },
});

router.map(routes, top);
router.map(routes.api, api);
router.map(routes.api.protected, apiController);

router.get(`${base}/static/*path`, ({ request }) => staticFiles.fetch(request));
router.get(`${assetsPath}/*path`, ({ request }) => assets.fetch(request));
router.get(`${base}/og/*path`, ({ request }) => serveOgImage(request));
router.get(
  `${base}/sw.js`,
  () =>
    new Response(serviceWorker, {
      headers: {
        "content-type": "text/javascript; charset=utf-8",
        "cache-control": "no-cache",
        "service-worker-allowed": `${base}/`,
      },
    }),
);

/**
 * Where the static crawl starts.
 *
 * Pages are reached by following links from `/`. The exceptions are things nothing links to: the
 * social cards (an `og:image` is an absolute URL meant for someone else's server) and the service
 * worker (the push manager registers it by URL from script). `/api/*` is deliberately absent.
 */
export const entryPoints: readonly string[] = [
  "/",
  ...ogPaths(),
  "/sw.js",
];

export default router;
