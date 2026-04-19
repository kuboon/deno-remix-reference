/**
 * Counter — a @remix-run/component `clientEntry`.
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
} from "@remix-run/component";

// Render props must satisfy `SerializableProps`, which is an index signature.
// Declaring the index signature here keeps `label` strongly typed while
// satisfying the constraint.
export interface CounterProps {
  label: string;
  [key: string]: SerializableValue;
}

export const Counter = clientEntry(
  "/counter.js#Counter",
  function Counter(handle: Handle, setup: number) {
    // Setup phase — runs once per instance (server + client).
    let count = setup;

    // Render phase — runs on first render and every `handle.update()`.
    return (props: CounterProps) => (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.5rem 1rem",
          border: "1px solid #ccc",
          borderRadius: "8px",
          fontSize: "1.25rem",
        }}
      >
        <button
          type="button"
          aria-label="decrement"
          mix={[
            on("click", () => {
              count--;
              handle.update();
            }),
          ]}
        >
          −
        </button>
        <output
          style={{
            minWidth: "3ch",
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
            fontWeight: 600,
          }}
        >
          {count}
        </output>
        <button
          type="button"
          aria-label="increment"
          mix={[
            on("click", () => {
              count++;
              handle.update();
            }),
          ]}
        >
          +
        </button>
        <span style={{ color: "#666", fontSize: "0.9rem" }}>
          {props.label}
        </span>
      </div>
    );
  },
);
