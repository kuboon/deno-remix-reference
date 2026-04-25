---
name: add-middleware
description: Use when creating a new Remix v3 fetch-router middleware. Covers the middleware signature, context keys, and router/route-level application.
---

# Add Middleware

Remix v3 (fetch-router) のミドルウェアを作成・追加する。

## Remix v3 ミドルウェアの仕様

```ts
// ミドルウェア関数の型
type Middleware = (
  context: RequestContext,
  next: () => Promise<Response>,
) => Response | void | Promise<Response | void>;
```

## ミドルウェア作成手順

1. `RequestContext` の `request`, `get()`, `set()`, `has()`
   を使ってリクエストを処理
2. `next()` を呼ぶと次のミドルウェア/ハンドラに渡る
3. Response を返すとチェーンを中断

## コンテキストキーの作成

```ts
import { createContextKey } from "@remix-run/fetch-router";

const MyKey = createContextKey<MyType>();

// ミドルウェア内で設定
context.set(MyKey, value);

// ハンドラ内で取得
const value = context.get(MyKey);
```

## ルーターレベル vs ルートレベル

```ts
// ルーターレベル（全ルートに適用）
const router = createRouter({
  middleware: [loggerMiddleware, corsMiddleware],
});

// ルートレベル（特定ルートのみ）
router.get("/protected", {
  middleware: [authMiddleware],
  handler(ctx) { ... },
});
```

## 参考ファイル

- `packages/remix-dpop-session-middleware/mod.ts` — DPoP
  セッションミドルウェア実装例
- `reference/server/middleware/dpop.ts` — ミドルウェアの設定例
- `reference/server/router.ts` — ミドルウェアの使用例
