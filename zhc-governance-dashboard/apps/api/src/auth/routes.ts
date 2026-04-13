/**
 * Auth routes — Fastify plugin.
 *
 * Endpoints:
 *   GET  /auth/google              → redirect to Google OIDC
 *   GET  /auth/google/callback     → exchange code, issue tokens, redirect
 *   GET  /auth/github              → redirect to GitHub OAuth2
 *   GET  /auth/github/callback     → exchange code, issue tokens, redirect
 *   POST /auth/refresh             → rotate refresh token, issue new pair
 *   POST /auth/logout              → clear auth cookies
 *   GET  /auth/me                  → return current user info (requires auth)
 *
 * CSRF protection for OAuth2 flows:
 *   - On initiation:  generate `state`, set in httpOnly cookie (SameSite=Lax)
 *   - On callback:    compare `state` query param vs cookie; reject if mismatch
 */

import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  buildGoogleAuthorizationUrl,
  buildGithubAuthorizationUrl,
  fetchGoogleUserProfile,
  fetchGithubUserProfile,
  resolveUserFromOAuthProfile,
} from "./oauth.js";
import { issueTokenPair, rotateTokens } from "./jwt.js";
import {
  setTokenCookies,
  clearTokenCookies,
  setOAuthStateCookie,
  clearOAuthStateCookie,
  REFRESH_TOKEN_COOKIE,
  OAUTH_STATE_COOKIE,
} from "./cookies.js";
import { requireAuth, assertUser } from "./middleware.js";
import { getAuthConfig } from "./config.js";

export async function authRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
): Promise<void> {
  const cfg = getAuthConfig();

  // -------------------------------------------------------------------------
  // Google OAuth2 — initiation
  // -------------------------------------------------------------------------
  fastify.get("/auth/google", async (request, reply) => {
    const { url, state } = buildGoogleAuthorizationUrl();
    setOAuthStateCookie(reply, state);
    await reply.redirect(url);
  });

  // -------------------------------------------------------------------------
  // Google OAuth2 — callback
  // -------------------------------------------------------------------------
  fastify.get<{
    Querystring: { code?: string; state?: string; error?: string };
  }>("/auth/google/callback", async (request, reply) => {
    const { code, state, error } = request.query;

    if (error) {
      return reply.redirect(
        `${cfg.APP_FRONTEND_URL}/auth/error?reason=${encodeURIComponent(error)}`,
      );
    }

    if (!code || !state) {
      return reply.code(400).send({ error: "Missing code or state" });
    }

    // CSRF check
    const cookies = request.cookies as Record<string, string | undefined>;
    const savedState = cookies[OAUTH_STATE_COOKIE];
    if (!savedState || savedState !== state) {
      return reply.code(400).send({ error: "Invalid state parameter (CSRF check failed)" });
    }
    clearOAuthStateCookie(reply);

    let tokens;
    try {
      const profile = await fetchGoogleUserProfile(code);
      const user = await resolveUserFromOAuthProfile(profile);
      tokens = await issueTokenPair(user);
    } catch (err) {
      fastify.log.error(err, "Google auth callback error");
      return reply.redirect(
        `${cfg.APP_FRONTEND_URL}/auth/error?reason=auth_failed`,
      );
    }

    setTokenCookies(
      reply,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.refreshExpiresIn,
    );

    return reply.redirect(`${cfg.APP_FRONTEND_URL}/dashboard`);
  });

  // -------------------------------------------------------------------------
  // GitHub OAuth2 — initiation
  // -------------------------------------------------------------------------
  fastify.get("/auth/github", async (request, reply) => {
    const { url, state } = buildGithubAuthorizationUrl();
    setOAuthStateCookie(reply, state);
    await reply.redirect(url);
  });

  // -------------------------------------------------------------------------
  // GitHub OAuth2 — callback
  // -------------------------------------------------------------------------
  fastify.get<{
    Querystring: { code?: string; state?: string; error?: string };
  }>("/auth/github/callback", async (request, reply) => {
    const { code, state, error } = request.query;

    if (error) {
      return reply.redirect(
        `${cfg.APP_FRONTEND_URL}/auth/error?reason=${encodeURIComponent(error)}`,
      );
    }

    if (!code || !state) {
      return reply.code(400).send({ error: "Missing code or state" });
    }

    const cookies = request.cookies as Record<string, string | undefined>;
    const savedState = cookies[OAUTH_STATE_COOKIE];
    if (!savedState || savedState !== state) {
      return reply.code(400).send({ error: "Invalid state parameter (CSRF check failed)" });
    }
    clearOAuthStateCookie(reply);

    let tokens;
    try {
      const profile = await fetchGithubUserProfile(code);
      const user = await resolveUserFromOAuthProfile(profile);
      tokens = await issueTokenPair(user);
    } catch (err) {
      fastify.log.error(err, "GitHub auth callback error");
      return reply.redirect(
        `${cfg.APP_FRONTEND_URL}/auth/error?reason=auth_failed`,
      );
    }

    setTokenCookies(
      reply,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.refreshExpiresIn,
    );

    return reply.redirect(`${cfg.APP_FRONTEND_URL}/dashboard`);
  });

  // -------------------------------------------------------------------------
  // Token refresh
  // -------------------------------------------------------------------------
  fastify.post("/auth/refresh", async (request, reply) => {
    const cookies = request.cookies as Record<string, string | undefined>;
    const refreshToken = cookies[REFRESH_TOKEN_COOKIE];

    if (!refreshToken) {
      return reply.code(401).send({ error: "No refresh token" });
    }

    let tokens;
    try {
      // TODO(DUTA-73): pass dbOps to enforce single-use and token family revocation
      tokens = await rotateTokens(refreshToken);
    } catch (err) {
      fastify.log.warn(err, "Token rotation failed");
      clearTokenCookies(reply);
      return reply.code(401).send({ error: "Refresh token invalid or expired" });
    }

    setTokenCookies(
      reply,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.refreshExpiresIn,
    );

    return reply.send({
      accessToken: tokens.accessToken,
      expiresIn: tokens.accessExpiresIn,
    });
  });

  // -------------------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------------------
  fastify.post("/auth/logout", async (request, reply) => {
    // TODO(DUTA-73): revoke the refresh JTI in DB if present
    clearTokenCookies(reply);
    return reply.send({ ok: true });
  });

  // -------------------------------------------------------------------------
  // Current user
  // -------------------------------------------------------------------------
  fastify.get(
    "/auth/me",
    { preHandler: [requireAuth()] },
    async (request, reply) => {
      const user = assertUser(request);
      return reply.send({
        userId: user.userId,
        tenantId: user.tenantId,
        role: user.role,
        name: user.name,
        email: user.email,
      });
    },
  );
}
