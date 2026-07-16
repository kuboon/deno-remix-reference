/**
 * SignInCard — a @remix-run/ui `clientEntry` for the /my page.
 *
 * Shows the DPoP session status, thumbprint, and a sign-out button. Signing in
 * is initiated from the navbar (NavAuth); when signed out this card just points
 * the user there.
 *
 * Replaces the old `<script type="module" src="/signin.js">` approach, which
 * did not run when /my was loaded via a Frame request (newly inserted
 * `<script>` nodes in a fragment swap don't execute). As a clientEntry, the
 * server emits a hydration marker that survives frame navigation, and the
 * shell's `run()` (./hydration.ts) picks it up and hydrates in place.
 *
 * Setup runs on both server and client. Browser-only work (DPoP key gen via
 * IndexedDB, IdP probing) is gated on `typeof document !== "undefined"`.
 */

import {
  clientEntry,
  type Handle,
  on,
  type SerializableValue,
} from "@remix-run/ui";

import { sessionStore } from "./session.ts";

export interface SignInCardProps {
  idpOrigin: string;
  [key: string]: SerializableValue;
}

type Variant = "info" | "success" | "error" | "";

export const SignInCard = clientEntry(
  "/signin_card.js#SignInCard",
  function SignInCard(handle: Handle<SignInCardProps>) {
    let signoutBusy = false;
    // Transient message for a user action (sign-out); otherwise the status is
    // derived from the shared session state in render.
    let actionStatus: { message: string; variant: Variant } | null = null;

    if (typeof document !== "undefined") {
      sessionStore.addEventListener("change", () => handle.update(), {
        signal: handle.signal,
      });
      void sessionStore.load();
    }

    const onSignoutClick = async () => {
      signoutBusy = true;
      actionStatus = null;
      handle.update();
      try {
        await sessionStore.signOut();
        actionStatus = {
          message: "サインアウトしました。",
          variant: "success",
        };
      } catch (error) {
        actionStatus = {
          message: `サインアウトに失敗: ${(error as Error).message}`,
          variant: "error",
        };
      } finally {
        signoutBusy = false;
        handle.update();
      }
    };

    return () => {
      const ready = sessionStore.ready;
      const signedIn = sessionStore.userId !== null;

      let status: string;
      let statusVariant: Variant;
      if (actionStatus) {
        status = actionStatus.message;
        statusVariant = actionStatus.variant;
      } else if (!ready) {
        status = "セッションを確認しています…";
        statusVariant = "info";
      } else if (signedIn) {
        status = "セッションを取得しました。";
        statusVariant = "success";
      } else {
        status = "";
        statusVariant = "";
      }

      const userInfo = signedIn
        ? `サインイン中: ${sessionStore.userId}`
        : ready
        ? "サインインしていません。"
        : "…";
      const thumbprint = sessionStore.thumbprint || "…";

      const alertClass = statusVariant
        ? `alert alert-${statusVariant} alert-soft`
        : "alert alert-soft";
      return (
        <div class="card card-border bg-base-100">
          <div class="card-body">
            <h2 class="card-title">状態</h2>
            <div role="alert" class={alertClass}>
              <span>{status}</span>
            </div>
            <p class="mt-2">{userInfo}</p>
            <p>
              このブラウザの DPoP thumbprint: <code>{thumbprint}</code>
            </p>
            {ready && !signedIn
              ? (
                <p class="text-sm text-base-content/70">
                  サインインするには、ナビバー右上の「Sign
                  In」ボタンを使用してください。
                </p>
              )
              : null}
            <div class="card-actions mt-2">
              {ready && signedIn
                ? (
                  <button
                    type="button"
                    class="btn btn-outline"
                    disabled={signoutBusy}
                    mix={[on("click", onSignoutClick)]}
                  >
                    サインアウト
                  </button>
                )
                : null}
            </div>
          </div>
        </div>
      );
    };
  },
);
