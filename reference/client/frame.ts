/**
 * Browser frame resolver for the shell's `<Frame name="content">` region.
 *
 * Kept out of ./hydration.ts — which calls `run()` at module scope — so the
 * resolver can be imported and asserted on without booting the runtime.
 *
 * Since `@remix-run/ui` 0.5 the resolver takes a single options object
 * (`target`, `signal`, and for enhanced form submissions `formData` / `method`
 * / `encType`) instead of positional `(src, signal, target)`. The old shape
 * still compiles against the new type — it just silently loses the target and
 * the abort signal — so ./frame.test.ts pins the contract.
 */

import type { ResolveFrameOptions } from "@remix-run/ui";

export const FRAME_HEADER = "rmx-frame";

/** Fetch options a frame load turns into, split out so tests can assert them. */
export function frameRequestInit(options?: ResolveFrameOptions): RequestInit {
  const headers = new Headers({
    accept: "text/html",
    [FRAME_HEADER]: "1",
  });
  if (options?.target) headers.set("rmx-target", options.target);
  return { headers, signal: options?.signal };
}

/**
 * Loads frame content from this origin, tagging the request so the router
 * returns the bare fragment instead of the full shell.
 */
export async function resolveFrame(
  src: string,
  options?: ResolveFrameOptions,
): Promise<ReadableStream<Uint8Array> | string> {
  const response = await fetch(src, frameRequestInit(options));
  return response.body ?? (await response.text());
}
