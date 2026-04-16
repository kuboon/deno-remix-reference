---
name: dpop-debug
description: Use when debugging DPoP proof verification failures. Covers all error codes from packages/dpop/server/mod.ts, proof structure, and test proof generation.
---

# DPoP Debug

DPoP 検証エラーのデバッグ手順。

## エラーコード一覧 (`packages/dpop/server/mod.ts`)

| コード | 意味 | 対処 |
|--------|------|------|
| `missing-dpop-header` | `DPoP` ヘッダーがない | リクエストに `DPoP` ヘッダーを追加 |
| `invalid-format` | JWT が 3 セグメントでない | `header.payload.signature` の形式か確認 |
| `invalid-json` | header/payload が JSON でない | Base64url デコード後に JSON parse できるか確認 |
| `invalid-type` | `typ` が `dpop+jwt` でない | ヘッダの `typ` を `"dpop+jwt"` に |
| `unsupported-algorithm` | `alg` が `ES256` 以外 | `ES256` を使用 |
| `invalid-jwk` | `jwk` が EC P-256 として無効 | `kty: "EC"`, `crv: "P-256"`, `x`, `y` を含める |
| `method-mismatch` | `htm` がリクエストメソッドと一致しない | proof の `htm` を揃える |
| `url-mismatch` | `htu` がリクエスト URL と一致しない | `origin + pathname + search` に揃える |
| `invalid-url` | リクエスト URL が不正 | サーバー側の URL を確認 |
| `invalid-jti` | `jti` が空または非文字列 | `crypto.randomUUID()` などで一意値を設定 |
| `invalid-iat` | `iat` が数値でない | 秒単位の UNIX 時刻 (number) を設定 |
| `future-iat` | `iat` が未来 (clockSkew 超過) | クライアントの時計を確認 |
| `expired` | `iat` が `maxAgeSeconds` より古い | proof を再生成 |
| `replay-detected` | `checkReplay` が false を返した | 毎回新しい `jti` で proof を生成 |
| `invalid-signature` | 署名検証に失敗 | payload 改ざん、鍵不一致などを確認 |

## DPoP Proof の構造

```
Header: { typ: "dpop+jwt", alg: "ES256", jwk: { kty: "EC", crv: "P-256", x, y } }
Payload: { htm: "GET", htu: "https://example.com/api", jti: "uuid", iat: 1234567890 }
```

## デバッグ手順

1. proof を Base64url デコードしてヘッダーとペイロードを確認:
   ```ts
   const [header, payload] = proof.split('.').slice(0, 2).map(
     (p) => JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')))
   );
   ```

2. `htm` がリクエストメソッドと一致するか確認
3. `htu` がリクエスト URL (`origin + pathname + search`) と一致するか確認
4. `iat` が現在時刻 ± `clockSkewSeconds` / `maxAgeSeconds` の範囲内か確認
5. 公開鍵 (`jwk`) で署名が検証できるか確認

## テスト用 proof 生成

`@scope/dpop/client.ts` を使うとキー生成と proof 付与が一括でできる:

```ts
import { init } from "@scope/dpop/client.ts";
import { InMemoryKeyRepository } from "../../packages/dpop/client/client_keystore.ts";

const keyStore = new InMemoryKeyRepository();
const { fetchDpop } = await init({ keyStore });

const res = await fetchDpop("http://localhost:3000/api/protected", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ hello: "world" }),
});
```

## 参照ファイル

- `packages/dpop/server/mod.ts` — 検証ロジック (`verifyDpopProof`, `verifyDpopProofFromRequest`)
- `packages/dpop/server/verify.test.ts` — 全エラーコードのテストケース
- `packages/dpop/client/mod.ts` — クライアント側 proof 生成 (`init`, `fetchDpop`)
- `packages/dpop-middleware/mod.ts` — Remix v3 統合
