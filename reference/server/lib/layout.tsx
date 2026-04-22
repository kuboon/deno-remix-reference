/**
 * Server helpers for the frame-based page shell.
 *
 * The app is served as a single persistent shell (nav + `<Frame name="content">`).
 * Client-side, `run()` sets up `startNavigationListener` internally so that any
 * `<a rmx-target="content">` click becomes a frame reload instead of a full
 * document navigation.
 *
 * Content routes call {@link renderPage}:
 *   - If the request carries the `rmx-frame` header (set by `resolveFrame`
 *     on both the server and client sides), they return just the fragment.
 *   - Otherwise they render the full shell with the current URL as the
 *     initial frame src; the server-side `resolveFrame` then dispatches
 *     back into the same router to fetch the fragment.
 */

import { Frame, type RemixNode } from "@remix-run/component";
import { renderToStream } from "@remix-run/component/server";

export type Dispatch = (request: Request) => Promise<Response>;

export const FRAME_HEADER = "rmx-frame";

export const isFrameRequest = (request: Request): boolean =>
  request.headers.get(FRAME_HEADER) === "1";

export function renderPage(
  request: Request,
  fragment: RemixNode,
  dispatch: Dispatch,
): Response {
  if (isFrameRequest(request)) {
    return renderFragment(fragment);
  }
  return renderFrameShell(request, dispatch);
}

export function renderFragment(body: RemixNode): Response {
  const stream = renderToStream(body);
  return new Response(stream, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export function renderFrameShell(
  request: Request,
  dispatch: Dispatch,
): Response {
  const url = new URL(request.url);
  const initialSrc = url.pathname === "/"
    ? "/welcome"
    : url.pathname + url.search;
  const stream = renderToStream(
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>DPoP Reference</title>
        <link rel="icon" href="data:image/png;base64,iVBORw0KGgo=" />
        <script async type="module" src="/mod.js"></script>
        <style>
          {`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { height: 100%; }
          body { display: flex; flex-direction: column; font-family: system-ui, sans-serif; color: #1a1a1a; line-height: 1.6; }
          header { padding: 1rem 2rem; border-bottom: 1px solid #ddd; background: #fafafa; }
          header nav a { color: #0066cc; margin-right: 1rem; text-decoration: none; }
          header nav a:hover { text-decoration: underline; }
          main { padding: 2rem; max-width: 800px; width: 100%; margin: 0 auto; }
          h1 { margin-bottom: 1rem; }
          h2 { margin-top: 2rem; margin-bottom: 0.5rem; }
          p { margin-bottom: 0.75rem; }
          code { font-family: 'Fira Code', monospace; background: #f5f5f5; padding: 0.1rem 0.3rem; border-radius: 3px; }
          button { padding: 0.5rem 1rem; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 1rem; }
          button:hover { background: #e8e8e8; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; }
          `}
        </style>
      </head>
      <body>
        <header>
          <nav>
            <a href="/welcome" rmx-target="content">Home</a>
            <a href="/signin" rmx-target="content">Sign In</a>
            <a href="/hydration" rmx-target="content">Hydration</a>
          </nav>
        </header>
        <Frame
          name="content"
          src={initialSrc}
          fallback={<main><p>Loading…</p></main>}
        />
      </body>
    </html>,
    {
      frameSrc: request.url,
      async resolveFrame(src, target, context) {
        const base = context?.currentFrameSrc ?? request.url;
        const resolvedUrl = new URL(src, base);
        const headers = new Headers({
          accept: "text/html",
          [FRAME_HEADER]: "1",
        });
        if (target) headers.set("rmx-target", target);
        const response = await dispatch(
          new Request(resolvedUrl, { headers }),
        );
        return response.body!;
      },
    },
  );
  return new Response(stream, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
