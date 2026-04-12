/**
 * Component hydration demo — client entry.
 *
 * 1. Reads server-generated initial state from a `<script type="application/json">`
 *    data island.
 * 2. Attaches click handlers to the SSR-rendered counter DOM (this is the
 *    "hydration" step — no DOM replacement, just wiring up behavior).
 * 3. On each click, updates local state and re-renders the counter via the
 *    same `renderCounter()` function the server used.
 */

import { renderCounter, type CounterState } from "../shared/counter.ts";

const stateEl = document.getElementById("__HYDRATION_STATE__");
if (!stateEl?.textContent) {
  throw new Error("Missing #__HYDRATION_STATE__ data island");
}
let state: CounterState = JSON.parse(stateEl.textContent);

const root = document.getElementById("counter-root");
if (!root) {
  throw new Error("Missing #counter-root mount point");
}

function update(next: CounterState): void {
  state = next;
  // Re-render using the same function the server used. `SafeHtml` is a
  // boxed String, so we coerce with `String(...)` before assigning.
  root!.innerHTML = String(renderCounter(state));
  attachHandlers();
}

function attachHandlers(): void {
  const counter = root!.querySelector<HTMLElement>('[data-component="counter"]');
  if (!counter) return;
  counter.dataset.hydrated = "true";

  counter.querySelectorAll<HTMLButtonElement>("button[data-action]").forEach(
    (btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        if (action === "inc") {
          update({ ...state, count: state.count + 1 });
        } else if (action === "dec") {
          update({ ...state, count: state.count - 1 });
        }
      });
    },
  );
}

// Hydrate: the counter HTML is already in the DOM (server-rendered).
// We only need to wire up event handlers.
attachHandlers();

console.log("[hydration] hydrated counter with state:", state);
