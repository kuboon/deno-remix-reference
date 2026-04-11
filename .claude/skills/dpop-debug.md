# DPoP Debug

DPoP 検証エラーのデバッグ手順。

## エラーコード一覧

| コード | 意味 | 対処 |
|--------|------|------|
| `missing_dpop_header` | `DPoP` ヘッダーがない | リクエストに `DPoP` ヘッダーを追加 |
| `invalid_proof` | JWT 署名検証失敗 / 期限切れ | 署名アルゴリズム、鍵、iat を確認 |
| `htm_mismatch` | HTTP メソッド不一致 | proof の `htm` がリクエストメソッドと一致するか確認 |
| `htu_mismatch` | URI 不一致 | proof の `htu` が `origin + pathname` と一致するか確認 |
| `missing_jti` | jti クレームがない | proof に一意の `jti` (UUID) を含める |
| `ath_mismatch` | アクセストークンハッシュ不一致 | `ath` が正しい SHA-256 ハッシュか確認 |
| `nonce_mismatch` | nonce 不一致 | サーバー発行の nonce を使用 |
| `replay_detected` | 同じ proof の再利用 | 毎回新しい `jti` で proof を生成 |

## DPoP Proof の構造

```
Header: { typ: "dpop+jwt", alg: "ES256", jwk: { kty, crv, x, y } }
Payload: { htm: "GET", htu: "https://...", jti: "uuid", iat: 1234567890 }
```

## デバッグ手順

1. proof を Base64url デコードしてヘッダーとペイロードを確認:
   ```ts
   const [header, payload] = proof.split('.').slice(0, 2).map(
     p => JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')))
   );
   ```

2. `htm` がリクエストメソッドと一致するか確認
3. `htu` がリクエスト URL (origin + pathname、クエリなし) と一致するか確認
4. `iat` が現在時刻から 300 秒以内か確認
5. 公開鍵 (`jwk`) で署名が検証できるか確認

## テスト用 proof 生成

```ts
import { SignJWT, generateKeyPair, exportJWK } from "jose";
const kp = await generateKeyPair("ES256");
const jwk = await exportJWK(kp.publicKey);
const proof = await new SignJWT({
  htm: "GET",
  htu: "http://localhost:3000/api/protected",
  jti: crypto.randomUUID(),
  iat: Math.floor(Date.now() / 1000),
}).setProtectedHeader({ typ: "dpop+jwt", alg: "ES256", jwk })
  .sign(kp.privateKey);
```

## ファイル

- `packages/remix-dpop/dpop.ts` — 検証ロジック
- `packages/remix-dpop/dpop_test.ts` — テストケース
- `packages/remix-dpop/replay.ts` — リプレイ検出
