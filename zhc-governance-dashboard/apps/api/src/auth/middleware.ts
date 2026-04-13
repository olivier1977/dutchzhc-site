/**
 * Fastify authentication middleware.
 *
 * Usage:
 *   route.addHook("preHandler", requireAuth())
 *   route.addHook("preHandler", requireAuth({ minRole: "admin" }))
 *
 * Token resolution order:
 *   1. Authorization: Bearer <token> header
 *   2. zhc_at httpOnly cookie
 *
 * On success, `request.user` is populated with `AuthenticatedUser`.
 * On failure, replies with 401 (unauthenticated) or 403 (insufficient role).
 */

import type {
  FastifyRequest,
  FastifyReply,
  HookHandlerDoneFunction,
} from "fastify";
import type { AuthenticatedUser, Role } from "@zhc-governance/shared";
import { hasRole } from "@zhc-governance/shared";
import { verifyAccessToken } from "./jwt.js";
import { ACCESS_TOKEN_COOKIE } from "./cookies.js";

// Augment Fastify's Request type to include the authenticated user
declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export interface RequireAuthOptions {
  /** Minimum role required. Defaults to "auditor" (any authenticated user). */
  minRole?: Role;
}

/**
 * Returns a preHandler hook that enforces authentication and optionally a
 * minimum role. Attach to individual routes or route groups.
 */
export function requireAuth(options: RequireAuthOptions = {}) {
  const { minRole = "auditor" } = options;

  return async function authPreHandler(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const token = extractToken(request);

    if (!token) {
      await reply.code(401).send({
        error: "Unauthorized",
        message: "Authentication required",
      });
      return;
    }

    let claims;
    try {
      claims = await verifyAccessToken(token);
    } catch {
      await reply.code(401).send({
        error: "Unauthorized",
        message: "Invalid or expired token",
      });
      return;
    }

    if (!hasRole(claims.role, minRole)) {
      await reply.code(403).send({
        error: "Forbidden",
        message: `Role '${claims.role}' is insufficient; '${minRole}' or higher required`,
      });
      return;
    }

    request.user = {
      userId: claims.sub,
      tenantId: claims.tenantId,
      role: claims.role,
      name: claims.name,
      email: claims.email,
      accessJti: claims.jti,
    };
  };
}

/** Extract the bearer token from header or cookie. */
function extractToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookies = request.cookies as Record<string, string | undefined>;
  const cookieToken = cookies[ACCESS_TOKEN_COOKIE];
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Convenience guard — call inside a route handler to assert the user is set.
 * Throws if called without `requireAuth` in the preHandler chain.
 */
export function assertUser(request: FastifyRequest): AuthenticatedUser {
  if (!request.user) {
    throw new Error(
      "assertUser() called without requireAuth() in the preHandler chain",
    );
  }
  return request.user;
}
