/**
 * Shared HTML page layout for routes that use `@remix-run/html-template`.
 * Routes that render via `@remix-run/component` (e.g. /hydration) build
 * their own JSX page tree and don't go through here.
 */

import { RemixNode } from "@remix-run/component";
import { renderToStream } from "@remix-run/component/server";

export const renderLayout = (title: string, body: RemixNode): Response => {
  const stream = renderToStream(
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title} — DPoP Reference</title>
        <link rel="icon" href="data:image/png;base64,iVBORw0KGgo=" />
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/signin">Sign In</a>
          <a href="/hydration">Hydration</a>
        </nav>
        ${body}
      </body>
    </html>,
  );
  return new Response(stream, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
};
