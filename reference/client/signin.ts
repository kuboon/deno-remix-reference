/**
 * Sign-in client — runs on /signin.
 *
 * Reads IDP origin from `<meta name="idp-origin">`, generates (or loads) a
 * DPoP key pair, and offers two actions:
 *  - "Sign in with kbn.one" → redirect to `${IDP}/authorize?dpop_jkt&redirect_uri`
 *  - On page load: probe `${IDP}/session` with our DPoP proof. If the IdP has
 *    bound a userId to our jkt, show it.
 */

import { init } from "@kuboon/dpop";

const idpOriginMeta = document.querySelector(
  'meta[name="idp-origin"]',
) as HTMLMetaElement | null;
const idpOrigin = idpOriginMeta?.content?.trim();

const statusEl = document.getElementById("status")!;
const userInfoEl = document.getElementById("user-info")!;
const signinButton = document.getElementById("signin") as HTMLButtonElement;
const signoutButton = document.getElementById("signout") as HTMLButtonElement;
const thumbprintEl = document.getElementById("thumbprint")!;

const setStatus = (message: string, cls?: string) => {
  statusEl.textContent = message;
  statusEl.className = cls ?? "";
};

if (!idpOrigin) {
  setStatus("IDP_ORIGIN が設定されていません。", "error");
  throw new Error("IDP_ORIGIN missing");
}

const { fetchDpop, thumbprint } = await init();
thumbprintEl.textContent = thumbprint;

const renderSignedIn = (userId: string) => {
  userInfoEl.textContent = `サインイン中: ${userId}`;
  signinButton.hidden = true;
  signoutButton.hidden = false;
};

const renderSignedOut = () => {
  userInfoEl.textContent = "サインインしていません。";
  signinButton.hidden = false;
  signoutButton.hidden = true;
};

const fetchSession = async (): Promise<{ userId: string | null } | null> => {
  try {
    const response = await fetchDpop(`${idpOrigin}/session`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Failed to query IdP session", error);
    return null;
  }
};

signinButton.addEventListener("click", () => {
  const params = new URLSearchParams({
    dpop_jkt: thumbprint,
    redirect_uri: globalThis.location.href,
  });
  globalThis.location.href = `${idpOrigin}/authorize?${params.toString()}`;
});

signoutButton.addEventListener("click", async () => {
  signoutButton.disabled = true;
  try {
    await fetchDpop(`${idpOrigin}/session/logout`, { method: "POST" });
    renderSignedOut();
    setStatus("サインアウトしました。", "success");
  } catch (error) {
    setStatus(`サインアウトに失敗: ${(error as Error).message}`, "error");
  } finally {
    signoutButton.disabled = false;
  }
});

setStatus("セッションを確認しています…");
const session = await fetchSession();
if (session?.userId) {
  renderSignedIn(session.userId);
  setStatus("セッションを取得しました。", "success");
} else {
  renderSignedOut();
  setStatus("");
}
