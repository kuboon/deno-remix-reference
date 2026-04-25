---
name: add-route
description: Use when adding a new route to the Remix v3 fetch-router app.
---

# Add Route

Remix v3 (fetch-router) のルートを `reference/` アプリに追加する。

## ルート追加手順

1. `reference/server/router.ts` に `router.get()` / `router.post()` /
   `router.map()` でルートを登録
2. ハンドラは `(ctx: RequestContext) => Response | Promise<Response>` 形式
3. HTML ページの場合は `layout()` と `html` テンプレートタグを使用
4. JSON API の場合は `Response.json()` を返す

## DPoP 保護ルートの追加

```ts
import { dpop, DpopSession } from "../middleware/dpop.ts";

router.get("/api/new-route", {
  middleware: [dpop],
  handler(ctx) {
    const session = ctx.get(DpopSession);
    return Response.json({
      thumbprint: session.thumbprint,
      data: session.data,
    });
  },
});
```

## HTML ページの追加

```ts
router.get("/new-page", (_ctx) => {
  return htmlResponse(layout(
    "Page Title",
    html`
      <h1>New Page</h1>
      <p>Content here</p>
    `,
  ));
});
```

## ファイル

- `reference/server/router.ts` — 全ルート定義
- `reference/server/middleware/dpop.ts` — DPoP middleware の設定
- `packages/remix-dpop-session-middleware/mod.ts` — `dpopSession()` /
  `DpopSession` のソース
