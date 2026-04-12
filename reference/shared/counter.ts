/**
 * Isomorphic Counter component.
 *
 * `renderCounter(state)` returns `SafeHtml` that can be interpolated into:
 * - Server-side page templates (initial SSR)
 * - Client-side `element.innerHTML = String(renderCounter(state))` (re-render
 *   on state change, after hydration)
 *
 * Using the same function in both places guarantees the server-rendered DOM
 * and the post-hydration DOM stay structurally identical.
 */

import { html } from "@remix-run/html-template";
import type { SafeHtml } from "@remix-run/html-template";

export interface CounterState {
  count: number;
  label: string;
}

export function renderCounter(state: CounterState): SafeHtml {
  return html`
    <div class="counter" data-component="counter">
      <button type="button" data-action="dec" aria-label="decrement">−</button>
      <output data-role="count">${state.count}</output>
      <button type="button" data-action="inc" aria-label="increment">+</button>
      <span class="counter-label">${state.label}</span>
    </div>
  `;
}
