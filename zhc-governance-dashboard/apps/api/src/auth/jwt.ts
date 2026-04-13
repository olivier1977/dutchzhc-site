/**
 * JWT utilities — sign, verify, and rotate access/refresh tokens.
 *
 * Algorithm:   RS256 (asymmetric)
 * Access TTL:  15 min  (short-lived; bearer in Authorization header or httpOnly cookie)
 * Refresh TTL: 7 days  (long-lived; httpOnly + Secure + SameSite=Strict cookie only)
 *
 * On refresh:
 *   1. Verify refresh token signature and expiry.
 *   2. Look up the JTI in DB to confirm it has not been revoked.  ← DUTA-73
 *   3. Revoke the old refresh JTI.                                ← DUTA-73
 *   4. Issue new access + refresh pair (token rotation).
 *
 * DUTA-73 integration points are marked with TODO(DUTA-73).
 */

import {
  SignJWT,
  jwtVerify,
  importPKCS8,
  importSPKI,
  type KeyLike,
} from "jose";
import { nanoid } from "nanoid";
import type {
  AccessTokenClaims,
  RefreshTokenClaims,
  Role,
} from "@zhc-governance/shared";
import { getAuthConfig } from "./config.js";

// ---------------------------------------------------------------------------
// Key loading (cached after first call)
// ---------------------------------------------------------------------------

let _privateKey: KeyLike | null = null;
let _publicKey: KeyLike | null = null;

async function getPrivateKey(): Promise<KeyLike> {
  if (!_privateKey) {
    const cfg = getAuthConfig();
    _privateKey = await importPKCS8(cfg.JWT_PRIVATE_KEY_PEM, "RS256");
  }
  return _privateKey;
}

async function getPublicKey(): Promise<KeyLike> {
  if (!_publicKey) {
    const cfg = getAuthConfig();
    _publicKey = await importSPKI(cfg.JWT_PUBLIC_KEY_PEM, "RS256");
  }
  return _publicKey;
}

// ---------------------------------------------------------------------------
// Token issuance
// ---------------------------------------------------------------------------

export interface IssueTokensInput {
  userId: string;
  tenantId: string;
  role: Role;
  name: string;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
  accessJti: string;
  refreshJti: string;
}

export async function issueTokenPair(
  input: IssueTokensInput,
): Promise<TokenPair> {
  const cfg = getAuthConfig();
  const privateKey = await getPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  const accessJti = nanoid(24);
  const refreshJti = nanoid(24);

  const accessToken = await new SignJWT({
    tokenType: "access",
    tenantId: input.tenantId,
    role: input.role,
    name: input.name,
    email: input.email,
  } satisfies Omit<AccessTokenClaims, "sub" | "jti" | "iat" | "exp">)
    .setProtectedHeader({ alg: "RS256" })
    .setSubject(input.userId)
    .setJti(accessJti)
    .setIssuer(cfg.JWT_ISSUER)
    .setIssuedAt(now)
    .setExpirationTime(now + cfg.JWT_ACCESS_TOKEN_TTL_SECONDS)
    .sign(privateKey);

  const refreshToken = await new SignJWT({
    tokenType: "refresh",
    tenantId: input.tenantId,
    role: input.role,
    prevAccessJti: accessJti,
  } satisfies Omit<RefreshTokenClaims, "sub" | "jti" | "iat" | "exp">)
    .setProtectedHeader({ alg: "RS256" })
    .setSubject(input.userId)
    .setJti(refreshJti)
    .setIssuer(cfg.JWT_ISSUER)
    .setIssuedAt(now)
    .setExpirationTime(now + cfg.JWT_REFRESH_TOKEN_TTL_SECONDS)
    .sign(privateKey);

  return {
    accessToken,
    refreshToken,
    accessExpiresIn: cfg.JWT_ACCESS_TOKEN_TTL_SECONDS,
    refreshExpiresIn: cfg.JWT_REFRESH_TOKEN_TTL_SECONDS,
    accessJti,
    refreshJti,
  };
}

// ---------------------------------------------------------------------------
// Token verification
// ---------------------------------------------------------------------------

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenClaims> {
  const cfg = getAuthConfig();
  const publicKey = await getPublicKey();
  const { payload } = await jwtVerify(token, publicKey, {
    issuer: cfg.JWT_ISSUER,
    algorithms: ["RS256"],
  });

  if (payload["tokenType"] !== "access") {
    throw new Error("Token is not an access token");
  }

  return payload as unknown as AccessTokenClaims;
}

export async function verifyRefreshToken(
  token: string,
): Promise<RefreshTokenClaims> {
  const cfg = getAuthConfig();
  const publicKey = await getPublicKey();
  const { payload } = await jwtVerify(token, publicKey, {
    issuer: cfg.JWT_ISSUER,
    algorithms: ["RS256"],
  });

  if (payload["tokenType"] !== "refresh") {
    throw new Error("Token is not a refresh token");
  }

  return payload as unknown as RefreshTokenClaims;
}

// ---------------------------------------------------------------------------
// Token rotation
// ---------------------------------------------------------------------------

/**
 * Verify a refresh token and issue a fresh token pair.
 *
 * TODO(DUTA-73): Before issuing, look up `refreshClaims.jti` in the
 * `refresh_tokens` table to assert it has not been revoked, then
 * mark it as revoked (one-time-use enforcement).
 * If the JTI is already revoked, this is a replay attack — revoke all
 * tokens for the user (token family invalidation).
 */
export async function rotateTokens(
  refreshToken: string,
  /** Injected DB lookup — will be wired up once DUTA-73 lands. */
  dbOps?: {
    isRefreshJtiRevoked: (jti: string) => Promise<boolean>;
    revokeRefreshJti: (jti: string, userId: string) => Promise<void>;
    revokeAllUserTokens: (userId: string) => Promise<void>;
    getUserDetails: (
      userId: string,
      tenantId: string,
    ) => Promise<{ name: string; email: string; role: Role } | null>;
  },
): Promise<TokenPair> {
  const claims = await verifyRefreshToken(refreshToken);

  if (dbOps) {
    // TODO(DUTA-73): token family revocation
    const revoked = await dbOps.isRefreshJtiRevoked(claims.jti);
    if (revoked) {
      // Replay attack — invalidate entire family
      await dbOps.revokeAllUserTokens(claims.sub);
      throw new Error("Refresh token has been revoked (possible replay attack)");
    }

    await dbOps.revokeRefreshJti(claims.jti, claims.sub);

    // Fetch fresh user details (role may have changed)
    const user = await dbOps.getUserDetails(claims.sub, claims.tenantId);
    if (!user) throw new Error("User not found");

    return issueTokenPair({
      userId: claims.sub,
      tenantId: claims.tenantId,
      role: user.role,
      name: user.name,
      email: user.email,
    });
  }

  // Fallback: no DB ops yet (pre-DUTA-73) — rotate based on token claims
  // WARNING: this path does not enforce single-use; only for dev/scaffold
  return issueTokenPair({
    userId: claims.sub,
    tenantId: claims.tenantId,
    role: claims.role,
    name: "", // not in refresh token; will be populated post-DUTA-73
    email: "",
  });
}
