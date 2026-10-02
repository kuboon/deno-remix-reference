/**
 * NavAuth — the navbar's sign-in control, a `@remix-run/ui` clientEntry.
 *
 * Rendered into the shell (client/layout.tsx), so it hydrates on every page
 * and reflects the live DPoP session state:
 *   - signed out → a "Sign In" button that redirects straight to the IdP's
 *     `/authorize` (redirect_uri points back at `/my`);
 *   - signed in  → a "マイページ" link to `/my`.
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

import { IDP_ORIGIN } from "../idp.ts";
import { sessionStore } from "../session.ts";
import { actionStyle, primaryStyle } from "../theme.ts";

export interface NavAuthProps {
  /** App-relative href of the my-page, e.g. `/my` (carries the deploy prefix). */
  myHref: string;
  /**
   * Hand the link to the browser as a document navigation — set where the shell is rendered inside
   * a `@remix-run/spa` router (see `client/spa/app.tsx`), which would otherwise swallow `/my`.
   */
  documentLinks?: boolean;
  [key: string]: SerializableValue;
}

export const NavAuth = clientEntry(
  import.meta.url,
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
          <button type="button" mix={actionStyle} disabled>
            Sign In
          </button>
        );
      }
      if (sessionStore.userId !== null) {
        return (
          <a
            href={handle.props.myHref}
            data-rmx-document={handle.props.documentLinks ? "" : undefined}
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
  },
);
