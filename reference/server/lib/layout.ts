/**
 * Shared HTML page layout for routes that use `@remix-run/html-template`.
 * Routes that render via `@remix-run/component` (e.g. /hydration) build
 * their own JSX page tree and don't go through here.
 */

import { html } from "@remix-run/html-template";
import type { SafeHtml } from "@remix-run/html-template";

export function htmlResponse(content: SafeHtml): Response {
  return new Response(String(content), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export const layout = (title: string, body: SafeHtml): SafeHtml =>
  html`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — DPoP Reference</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1a1a1a; }
    h1 { margin-bottom: 1rem; }
    h2 { margin-top: 2rem; margin-bottom: 0.5rem; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; font-size: 0.9rem; margin: 0.5rem 0; }
    code { font-family: 'Fira Code', monospace; }
    a { color: #0066cc; }
    button { padding: 0.5rem 1rem; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 1rem; margin: 0.25rem; }
    button:hover { background: #e8e8e8; }
    .success { color: #16a34a; }
    .error { color: #dc2626; }
    #log { margin-top: 1rem; background: #1a1a1a; color: #e8e8e8; padding: 1rem; border-radius: 4px; min-height: 200px; max-height: 400px; overflow-y: auto; font-family: monospace; font-size: 0.85rem; white-space: pre-wrap; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; }
    nav { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #ddd; }
    nav a { margin-right: 1rem; }
  </style>
</head>
<body>
  <nav><a href="/">Home</a><a href="/demo">DPoP Demo</a><a href="/hydration">Hydration</a></nav>
  ${body}
</body>
</html>`;
