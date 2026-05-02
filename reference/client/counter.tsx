/**
 * Counter — a @remix-run/ui `clientEntry`.
 *
 * This file is the single source of truth for the Counter component:
 * - The server imports it directly and uses it inside its JSX tree; the
 *   server-side renderer walks the component, runs the setup function,
 *   calls the render function, and emits HTML + a hydration marker.
 * - This file is ALSO bundled standalone as `/counter.js` so the client
 *   runtime (`run()` in ./hydration.ts) can dynamically import it via
 *   the URL declared below and hydrate the DOM that the server emitted.
 *
 * The first argument to `clientEntry` is the public URL + `#ExportName`
 * that the client-side `loadModule` hook will use to fetch this module.
 */

import {
  clientEntry,
  type Handle,
  on,
  type SerializableValue,
} from "@remix-run/ui";

// Render props must satisfy `SerializableProps`, which is an index signature.
// Declaring the index signature here keeps `label` strongly typed while
// satisfying the constraint.
export interface CounterProps {
  initialCount: number;
  label: string;
  [key: string]: SerializableValue;
}

export const Counter = clientEntry(
  "/counter.js#Counter",
  function Counter(handle: Handle<CounterProps>) {
    // Setup phase — runs once per instance (server + client). Read the
    // initial value from props; subsequent prop changes do not reset count.
    let count = handle.props.initialCount;

    // Render phase — runs on first render and every `handle.update()`.
    return () => (
      <div class="inline-flex items-center gap-3 rounded-box border border-base-300 px-4 py-2">
        <button
          type="button"
          aria-label="decrement"
          class="btn btn-sm btn-circle btn-outline"
          mix={[
            on("click", () => {
              count--;
              handle.update();
            }),
          ]}
        >
          −
        </button>
        <output class="min-w-[3ch] text-center font-semibold text-xl tabular-nums">
          {count}
        </output>
        <button
          type="button"
          aria-label="increment"
          class="btn btn-sm btn-circle btn-primary"
          mix={[
            on("click", () => {
              count++;
              handle.update();
            }),
          ]}
        >
          +
        </button>
        <span class="text-sm text-base-content/60">
          {handle.props.label}
        </span>
      </div>
    );
  },
);
