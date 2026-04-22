/**
 * GET / — top page shell.
 *
 * Renders a persistent top navigation and an `<iframe name="content">`
 * that hosts the real pages. Nav links carry `target="content"` so
 * clicking them swaps the frame without reloading the outer shell.
 * The frame starts on /welcome (the former home intro).
 */

import type { RequestHandler } from "@remix-run/fetch-router";
import { renderToStream } from "@remix-run/component/server";

export const indexRoute: RequestHandler = (_ctx) => {
  const stream = renderToStream(
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>DPoP Reference</title>
        <link rel="icon" href="data:image/png;base64,iVBORw0KGgo=" />
        <style>
          {`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { height: 100%; }
          body { display: flex; flex-direction: column; font-family: system-ui, sans-serif; color: #1a1a1a; }
          header { padding: 1rem 2rem; border-bottom: 1px solid #ddd; background: #fafafa; }
          header nav a { color: #0066cc; margin-right: 1rem; text-decoration: none; }
          header nav a:hover { text-decoration: underline; }
          iframe[name="content"] { flex: 1; width: 100%; border: 0; background: #fff; }
        `}
        </style>
      </head>
      <body>
        <header>
          <nav>
            <a href="/welcome" target="content">Home</a>
            <a href="/signin" target="content">Sign In</a>
            <a href="/hydration" target="content">Hydration</a>
          </nav>
        </header>
        <iframe name="content" src="/welcome" title="content"></iframe>
      </body>
    </html>,
  );
  return new Response(stream, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};
