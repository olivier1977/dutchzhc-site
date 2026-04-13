/**
 * Row-Level Security (RLS) helpers.
 *
 * PostgreSQL RLS strategy:
 *   - Every tenant-scoped table has a `tenant_id UUID NOT NULL` column.
 *   - A Postgres policy enforces `tenant_id = current_setting('app.tenant_id')`.
 *   - Before executing any query, call `setTenantContext()` on the connection.
 *   - This provides a second layer of defence beyond application-level filtering.
 *
 * TODO(DUTA-73): Wire `setTenantContext` to the actual DB pool.
 *   Expected: a `pg.PoolClient` or Kysely transaction object.
 *
 * Role-based write guards are enforced at the API layer (not RLS), because
 * Postgres RLS is not well-suited to distinguishing read vs write within the
 * same role. Use `assertWritePermission()` in route handlers.
 */

import type { AuthenticatedUser, Role } from "@zhc-governance/shared";
import { hasRole } from "@zhc-governance/shared";

// ---------------------------------------------------------------------------
// Tenant context injection
// ---------------------------------------------------------------------------

/**
 * Set the current tenant context on a DB connection so that RLS policies fire.
 *
 * Call this at the start of every request that touches the DB, using the
 * tenantId from `request.user`.
 *
 * TODO(DUTA-73): Replace `_client` stub type with the real pool client type
 * (e.g. `import type { PoolClient } from 'pg'`).
 */
export async function setTenantContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _client: any,
  tenantId: string,
): Promise<void> {
  // TODO(DUTA-73): await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
  void tenantId;
  throw new Error("setTenantContext: DB pool not yet available (requires DUTA-73)");
}

/**
 * Wrap a DB operation with tenant context injection.
 *
 * Usage (once DUTA-73 is ready):
 *   const result = await withTenantContext(pool, user.tenantId, async (client) => {
 *     return client.query("SELECT * FROM agents WHERE tenant_id = $1", [user.tenantId]);
 *   });
 */
export async function withTenantContext<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _pool: any,
  tenantId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _fn: (client: any) => Promise<T>,
): Promise<T> {
  // TODO(DUTA-73): implement using real pool
  void tenantId;
  throw new Error("withTenantContext: DB pool not yet available (requires DUTA-73)");
}

// ---------------------------------------------------------------------------
// Application-layer permission guards
// ---------------------------------------------------------------------------

/**
 * Assert that the authenticated user has permission to write to the given
 * resource category. Throws a structured error on failure (catch in route
 * handler and translate to 403).
 */
export function assertWritePermission(
  user: AuthenticatedUser,
  requiredRole: Role = "operator",
): void {
  if (!hasRole(user.role, requiredRole)) {
    throw new PermissionDeniedError(
      `Role '${user.role}' cannot perform write operations requiring '${requiredRole}'`,
      user.role,
      requiredRole,
    );
  }
}

/** Assert that the user is acting within their own tenant. */
export function assertTenantScope(
  user: AuthenticatedUser,
  resourceTenantId: string,
): void {
  if (user.tenantId !== resourceTenantId) {
    throw new PermissionDeniedError(
      `Cross-tenant access denied`,
      user.role,
      "owner",
    );
  }
}

export class PermissionDeniedError extends Error {
  constructor(
    message: string,
    public readonly userRole: Role,
    public readonly requiredRole: Role,
  ) {
    super(message);
    this.name = "PermissionDeniedError";
  }
}
