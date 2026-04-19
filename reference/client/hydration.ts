/**
 * Client runtime boot for the /hydration page.
 *
 * Bundled into `public/hydration.js` and loaded by the server-rendered
 * page as `<script type="module" src="/hydration.js">`.
 *
 * `run()` walks the document, finds every `clientEntry` marker emitted by
 * `renderToStream`, and hydrates each one by dynamically importing the
 * corresponding module via the `loadModule` hook and re-running the
 * component over the existing DOM.
 */

import { run } from "@remix-run/component";
import { Counter } from "./counter.tsx";

const app = run({
  async loadModule(moduleUrl: string, exportName: string) {
    if (moduleUrl === "/counter.js" && exportName === "Counter") {
      return Counter;
    }
    const mod = await import(moduleUrl);
    return mod[exportName];
  },
});

await app.ready();

console.log("[hydration] runtime ready");
