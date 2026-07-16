/**
 * NavAuth — the navbar's sign-in control, a `@remix-run/ui` clientEntry.
 *
 * Rendered into the persistent shell (reference/server/ui/document.tsx) so it
 * hydrates once on the initial document load and reflects the live DPoP
 * session state:
 *   - signed out → a "Sign In" button that redirects straight to the IdP's
 *     `/authorize` (redirect_uri points back at `/my`);
 *   - signed in  → a "マイページ" link that frame-navigates to `/my`.
 *
 * Until the async session probe resolves it renders a disabled placeholder so
 * the navbar layout stays stable.
 */

import {
  clientEntry,
  type Handle,
  on,
  type SerializableValue,
} from "@remix-run/ui";

import { IDP_ORIGIN } from "./idp.ts";
import { sessionStore } from "./session.ts";

export interface NavAuthProps {
  /** App-relative href of the my-page, e.g. `/my`. */
  myHref: string;
  [key: string]: SerializableValue;
}

export const NavAuth = clientEntry(
  "/nav_auth.js#NavAuth",
  function NavAuth(handle: Handle<NavAuthProps>) {
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
          <button type="button" class="btn btn-ghost btn-sm" disabled>
            Sign In
          </button>
        );
      }
      if (sessionStore.userId !== null) {
        return (
          <a
            class="btn btn-ghost btn-sm"
            href={handle.props.myHref}
            rmx-target="content"
          >
            マイページ
          </a>
        );
      }
      return (
        <button
          type="button"
          class="btn btn-primary btn-sm"
          mix={[on("click", onSigninClick)]}
        >
          Sign In
        </button>
      );
    };
  },
);
