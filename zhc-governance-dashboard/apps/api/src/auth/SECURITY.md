# Auth System Security Architecture

**Status:** Implemented (DB integration pending DUTA-73)
**Owner:** CISO (fa319d33)
**Review required before merge:** Yes

---

## Token Strategy

| Property | Access Token | Refresh Token |
|----------|-------------|---------------|
| Algorithm | RS256 (asymmetric) | RS256 |
| TTL | 15 minutes | 7 days |
| Delivery | httpOnly cookie + response body | httpOnly cookie only |
| Cookie path | `/` | `/auth/refresh` (scoped) |
| SameSite | Strict | Strict |
| Secure | Yes (production) | Yes (production) |
| JTI tracking | Logged | Revocable (post-DUTA-73) |

**Why RS256?** Asymmetric signing lets future microservices verify tokens using the public key without needing the private key. The private key never leaves the API server.

**Why httpOnly cookies?** Eliminates the XSS token-theft attack surface. JS running in the browser cannot read `document.cookie` for httpOnly cookies. The access token is *also* returned in the response body for non-browser API clients (mobile apps, CLI tools) that cannot read httpOnly cookies.

---

## CSRF Protection

OAuth2 flows use a `state` parameter (32-byte random, `nanoid`):
- Generated server-side at flow initiation
- Stored in a short-lived httpOnly + SameSite=Lax cookie (`zhc_oauth_state`, 10 min TTL)
- Validated in the callback handler before processing the code
- Cookie cleared after validation (single-use)

`SameSite=Lax` is required for the state cookie because the OAuth provider redirects back cross-origin — `Strict` would cause the cookie to be dropped.

For the refresh endpoint, `SameSite=Strict` on the refresh token cookie provides CSRF protection without a separate token, as the browser will not send `Strict` cookies on cross-origin requests.

---

## Role Model

```
owner (40) > admin (30) > operator (20) > auditor (10)
```

| Role | Capabilities |
|------|-------------|
| owner | Full tenant control, billing, member management, tenant deletion |
| admin | Full operational access; cannot delete tenant or manage billing |
| operator | Manage agents, processes, governance integrations |
| auditor | Read-only; can export reports |

Role checks are enforced at two points:
1. `requireAuth({ minRole })` preHandler — rejects before route handler runs
2. `assertWritePermission(user, requiredRole)` — inline guard for specific operations

---

## Row-Level Security (RLS)

PostgreSQL-level enforcement via `SET LOCAL app.tenant_id = :tenantId` + policies:

```sql
CREATE POLICY tenant_isolation ON agents
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

Application-layer `assertTenantScope()` provides defence-in-depth.

**Status:** RLS helpers are implemented in `rls.ts`. DB wiring requires DUTA-73.

---

## Token Rotation & Replay Attack Prevention

On each `/auth/refresh` call:
1. Verify refresh token signature + expiry
2. Look up JTI in `refresh_tokens` table (DUTA-73)
3. If already revoked → **token family invalidation**: revoke ALL user tokens (replay attack)
4. Revoke the current JTI
5. Issue a fresh access + refresh pair

**Status:** Rotation logic is implemented in `jwt.ts::rotateTokens`. DB step requires DUTA-73.

---

## Security Headers

Applied via `@fastify/helmet`:
- `Content-Security-Policy` — script-src self only
- `Strict-Transport-Security` — max-age 1yr + preload (production)
- `X-Frame-Options` — DENY
- `X-Content-Type-Options` — nosniff

---

## Open Items (blocked on DUTA-73)

| Item | File | Marker |
|------|------|--------|
| Refresh token single-use revocation | `jwt.ts` | `TODO(DUTA-73)` |
| Token family invalidation on replay | `jwt.ts` | `TODO(DUTA-73)` |
| OAuth user find-or-create | `oauth.ts` | `TODO(DUTA-73)` |
| Tenant context injection (RLS) | `rls.ts` | `TODO(DUTA-73)` |
| Logout JTI revocation | `routes.ts` | `TODO(DUTA-73)` |
