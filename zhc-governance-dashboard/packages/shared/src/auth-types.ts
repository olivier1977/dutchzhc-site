/**
 * Shared authentication and authorization types for zhc-governance-dashboard.
 * Used by both the API (access control) and the web client (UI rendering).
 */

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

/**
 * Role hierarchy (most → least privileged):
 *   owner > admin > operator > auditor
 *
 * owner    – full tenant control, billing, member management, tenant deletion
 * admin    – full operational access; cannot delete tenant or manage billing
 * operator – manage agents, processes, governance integrations; no member mgmt
 * auditor  – read-only; can export reports and view all data within the tenant
 */
export type Role = "owner" | "admin" | "operator" | "auditor";

export const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 40,
  admin: 30,
  operator: 20,
  auditor: 10,
};

/** Returns true if `candidate` is at least as privileged as `required`. */
export function hasRole(candidate: Role, required: Role): boolean {
  return ROLE_HIERARCHY[candidate] >= ROLE_HIERARCHY[required];
}

// ---------------------------------------------------------------------------
// JWT claims
// ---------------------------------------------------------------------------

/** Claims included in both access and refresh tokens. */
export interface BaseTokenClaims {
  /** JWT ID — unique per token; used for refresh-token revocation. */
  jti: string;
  /** Subject — the user ID. */
  sub: string;
  /** The tenant the user is acting within. */
  tenantId: string;
  /** The user's role inside this tenant. */
  role: Role;
  /** Standard issued-at epoch seconds. */
  iat: number;
  /** Standard expiration epoch seconds. */
  exp: number;
}

/** Additional claims present only on access tokens. */
export interface AccessTokenClaims extends BaseTokenClaims {
  tokenType: "access";
  /** Display name, included to avoid a round-trip. */
  name: string;
  email: string;
}

/** Additional claims present only on refresh tokens. */
export interface RefreshTokenClaims extends BaseTokenClaims {
  tokenType: "refresh";
  /** Access-token JTI that this refresh token replaces on rotation. */
  prevAccessJti: string | null;
}

// ---------------------------------------------------------------------------
// OAuth2 provider
// ---------------------------------------------------------------------------

export type OAuthProvider = "google" | "github";

// ---------------------------------------------------------------------------
// Session user (attached to request context by auth middleware)
// ---------------------------------------------------------------------------

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  role: Role;
  name: string;
  email: string;
  /** Raw access-token JTI, kept for revocation checks. */
  accessJti: string;
}

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

export interface LoginRedirectResponse {
  /** The OAuth2 authorization URL to redirect the browser to. */
  authorizationUrl: string;
  /** CSRF state parameter — store in a short-lived cookie, verify in callback. */
  state: string;
}

export interface TokenResponse {
  /** Short-lived access token (bearer). */
  accessToken: string;
  /** Expiry of access token in seconds from now. */
  expiresIn: number;
  /** Refresh token is delivered via httpOnly cookie, NOT in this body. */
}

export interface MeResponse {
  userId: string;
  tenantId: string;
  role: Role;
  name: string;
  email: string;
}
