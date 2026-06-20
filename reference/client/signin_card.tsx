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

import { type FetchDpop, loadDpopSession } from "./session.ts";

export interface SignInCardProps {
  idpOrigin: string;
  [key: string]: SerializableValue;
}

export const SignInCard = clientEntry(
  "/signin_card.js#SignInCard",
  function SignInCard(handle: Handle<SignInCardProps>) {
    let status = "セッションを確認しています…";
    let statusVariant: "info" | "success" | "error" | "" = "info";
    let userInfo = "…";
    let thumbprint = "…";
    let signedIn = false;
    let ready = false;
    let signoutBusy = false;
    let fetchDpop: FetchDpop | null = null;

    const setStatus = (
      message: string,
      variant: "info" | "success" | "error" | "" = "",
    ) => {
      status = message;
      statusVariant = variant;
    };

    if (typeof document !== "undefined") {
      (async () => {
        try {
          const session = await loadDpopSession(handle.props.idpOrigin);
          fetchDpop = session.fetchDpop;
          thumbprint = session.thumbprint;

          if (session.userId) {
            signedIn = true;
            userInfo = `サインイン中: ${session.userId}`;
            setStatus("セッションを取得しました。", "success");
          } else {
            userInfo = "サインインしていません。";
            setStatus("");
          }
        } catch (error) {
          userInfo = "サインインしていません。";
          setStatus(
            `初期化に失敗: ${(error as Error).message}`,
            "error",
          );
        } finally {
          ready = true;
          handle.update();
        }
      })();
    }

    const onSignoutClick = async () => {
      if (!fetchDpop) return;
      signoutBusy = true;
      handle.update();
      try {
        await fetchDpop(`${handle.props.idpOrigin}/session/logout`, {
          method: "POST",
        });
        signedIn = false;
        userInfo = "サインインしていません。";
        setStatus("サインアウトしました。", "success");
      } catch (error) {
        setStatus(
          `サインアウトに失敗: ${(error as Error).message}`,
          "error",
        );
      } finally {
        signoutBusy = false;
        handle.update();
      }
    };

    return () => {
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
