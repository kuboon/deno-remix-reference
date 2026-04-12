---
name: add-route
description: Use when adding a new route to the Remix v3 fetch-router reference app. Covers HTML pages, JSON APIs, and DPoP-protected routes.
---

# Add Route

Remix v3 (fetch-router) のルートを `reference/` アプリに追加する。

## ルート追加手順

1. `reference/server.ts` に `router.get()` / `router.post()` / `router.map()` でルートを登録
2. ハンドラは `(ctx: RequestContext) => Response | Promise<Response>` 形式
3. HTML ページの場合は `layout()` と `html` テンプレートタグを使用
4. JSON API の場合は `Response.json()` を返す

## DPoP 保護ルートの追加

```ts
import { DPoPSessionKey, DPoPThumbprintKey } from "@scope/dpop-middleware";
import type { DPoPSession } from "@scope/dpop-middleware";

router.get("/api/new-route", {
  middleware: [dpopMiddleware],
  handler(ctx) {
    const session = ctx.get(DPoPSessionKey) as DPoPSession;
    const thumbprint = ctx.get(DPoPThumbprintKey) as string;
    return Response.json({ thumbprint, data: session.data });
  },
});
```

## HTML ページの追加

```ts
router.get("/new-page", (_ctx) => {
  return htmlResponse(layout("Page Title", html`
    <h1>New Page</h1>
    <p>Content here</p>
  `));
});
```

## ファイル

- `reference/server.ts` — 全ルート定義
- `packages/dpop-middleware/mod.ts` — DPoP middleware エクスポート
