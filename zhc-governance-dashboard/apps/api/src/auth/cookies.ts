/**
 * Cookie helpers for auth token storage.
 *
 * Security posture:
 * - httpOnly:  prevents JS access (XSS mitigation)
 * - Secure:    HTTPS-only in production
 * - SameSite:  Strict — blocks cross-site request forgery
 * - Path:      /auth for refresh token (scope to refresh endpoint)
 *
 * The access token is ALSO delivered as an httpOnly cookie (not just in the
 * JSON body) for browser clients. API clients that cannot use cookies should
 * use the accessToken from the response body with Authorization: Bearer.
 */

import type { FastifyReply } from "fastify";
import { getAuthConfig } from "./config.js";

export const ACCESS_TOKEN_COOKIE = "zhc_at";
export const REFRESH_TOKEN_COOKIE = "zhc_rt";
export const OAUTH_STATE_COOKIE = "zhc_oauth_state";

export function setTokenCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string,
  refreshExpiresIn: number,
): void {
  const cfg = getAuthConfig();
  const isProduction = cfg.NODE_ENV === "production";

  // Access token — short-lived, scoped to all routes
  reply.setCookie(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction || cfg.COOKIE_SECURE,
    sameSite: "strict",
    path: "/",
    domain: cfg.COOKIE_DOMAIN,
    maxAge: cfg.JWT_ACCESS_TOKEN_TTL_SECONDS,
  });

  // Refresh token — longer-lived, scoped to /auth/refresh only
  reply.setCookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction || cfg.COOKIE_SECURE,
    sameSite: "strict",
    path: "/auth/refresh",
    domain: cfg.COOKIE_DOMAIN,
    maxAge: refreshExpiresIn,
  });
}

export function clearTokenCookies(reply: FastifyReply): void {
  const cfg = getAuthConfig();
  const isProduction = cfg.NODE_ENV === "production";

  reply.clearCookie(ACCESS_TOKEN_COOKIE, {
    httpOnly: true,
    secure: isProduction || cfg.COOKIE_SECURE,
    sameSite: "strict",
    path: "/",
    domain: cfg.COOKIE_DOMAIN,
  });

  reply.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: isProduction || cfg.COOKIE_SECURE,
    sameSite: "strict",
    path: "/auth/refresh",
    domain: cfg.COOKIE_DOMAIN,
  });
}

/** Set a short-lived state cookie for CSRF protection in OAuth2 flows. */
export function setOAuthStateCookie(
  reply: FastifyReply,
  state: string,
): void {
  const cfg = getAuthConfig();
  const isProduction = cfg.NODE_ENV === "production";

  reply.setCookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: isProduction || cfg.COOKIE_SECURE,
    sameSite: "lax", // must be lax for OAuth2 redirect to work cross-origin
    path: "/auth",
    domain: cfg.COOKIE_DOMAIN,
    maxAge: 600, // 10 min — enough to complete the OAuth2 flow
  });
}

export function clearOAuthStateCookie(reply: FastifyReply): void {
  const cfg = getAuthConfig();
  const isProduction = cfg.NODE_ENV === "production";

  reply.clearCookie(OAUTH_STATE_COOKIE, {
    httpOnly: true,
    secure: isProduction || cfg.COOKIE_SECURE,
    sameSite: "lax",
    path: "/auth",
    domain: cfg.COOKIE_DOMAIN,
  });
}
