/**
 * NavAuth — the navbar's sign-in control, a `@remix-run/component` clientEntry.
 *
 * Rendered into the shell (client/layout.tsx), so it hydrates on every page
 * and reflects the live DPoP session state:
 *   - signed out → a "Sign In" button that redirects straight to the IdP's
 *     `/authorize` (redirect_uri points back at `/my`);
 *   - signed in  → a "マイページ" link to `/my`.
 *
 * Until the async session probe resolves it renders a disabled placeholder so
 * the navbar layout stays stable.
 *
 * Two exports, one component. `clientEntry()` does not wrap its function — it
 * stamps `$entry` on the very function it is given — so the plain component has
 * to be a separate function the island merely calls:
 *
 * - `NavAuth` is the island. Server-rendered, it leaves a hydration marker that
 *   the islands runtime (`hydration.ts`) loads and hydrates.
 * - `NavAuthView` is the same component without the stamp. The SPA demo's shell
 *   uses it: `@remix-run/spa`'s runtime cannot load a marker (its `loadModule`
 *   throws "SPA responses cannot hydrate client entries"), but it renders the
 *   shell in the browser itself, where a component needs no hydrating at all.
 */

import {
  clientEntry,
  type Handle,
  on,
  type SerializableValue,
} from "@remix-run/component";

import { IDP_ORIGIN } from "../idp.ts";
import { sessionStore } from "../session.ts";
import { actionStyle, primaryStyle } from "../theme.ts";

export interface NavAuthProps {
  /** App-relative href of the my-page, e.g. `/my` (carries the deploy prefix). */
  myHref: string;
  /**
   * Mark the my-page link as a document navigation. The SPA shell needs it:
   * `/my` hydrates islands, which only the islands runtime can do.
   */
  documentLink?: boolean;
  [key: string]: SerializableValue;
}

/** The control itself, with no hydration marker — see the module comment. */
export function NavAuthView(handle: Handle<NavAuthProps>) {
  if (typeof document !== "undefined") {
    // Re-render whenever the shared session changes (sign-in/out anywhere).
    sessionStore.addEventListener("change", () => handle.update(), {
      signal: handle.signal,
    });
    void sessionStore.load();
  }

  const onSigninClick = () => {
    const redirectUri =
      new URL(handle.props.myHref, globalThis.location.origin).href;
    const params = new URLSearchParams({
      dpop_jkt: sessionStore.thumbprint,
      redirect_uri: redirectUri,
    });
    globalThis.location.href = `${IDP_ORIGIN}/authorize?${params.toString()}`;
  };

  return () => {
    if (!sessionStore.ready) {
      return (
        <button type="button" mix={actionStyle} disabled>
          Sign In
        </button>
      );
    }
    if (sessionStore.userId !== null) {
      return (
        <a
          href={handle.props.myHref}
          data-rmx-document={handle.props.documentLink ? "" : undefined}
        >
          マイページ
        </a>
      );
    }
    return (
      <button
        type="button"
        mix={[actionStyle, primaryStyle, on("click", onSigninClick)]}
      >
        Sign In
      </button>
    );
  };
}

/** The island: the same control, stamped for hydration by the islands runtime. */
export const NavAuth = clientEntry(
  import.meta.url,
  function NavAuth(handle: Handle<NavAuthProps>) {
    return NavAuthView(handle);
  },
);
