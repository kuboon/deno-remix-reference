/**
 * Document — the persistent HTML shell (nav + `<Frame name="content">`).
 *
 * Client-side, `run()` (bundled from reference/client/mod.ts) turns clicks
 * on `<a rmx-target="content">` into frame reloads instead of full document
 * navigations.
 */

import { Frame } from "@remix-run/component";
import { routes } from "../routes.ts";

type DocumentProps = {
  initialSrc: string;
};

export function Document() {
  return ({ initialSrc }: DocumentProps) => (
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
            <a href={routes.welcome.href()} rmx-target="content">Home</a>
            <a href={routes.signin.href()} rmx-target="content">Sign In</a>
            <a href={routes.hydration.href()} rmx-target="content">Hydration</a>
          </nav>
        </header>
        <Frame
          name="content"
          src={initialSrc}
          fallback={
            <main>
              <p>Loading…</p>
            </main>
          }
        />
      </body>
    </html>
  );
}
