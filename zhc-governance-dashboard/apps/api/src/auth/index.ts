/**
 * Auth module public exports.
 * Import from here in the main API app; do not import internal files directly.
 */

export { authRoutes } from "./routes.js";
export { requireAuth, assertUser } from "./middleware.js";
export { assertWritePermission, assertTenantScope, PermissionDeniedError } from "./rls.js";
export { issueTokenPair, verifyAccessToken } from "./jwt.js";
export { getAuthConfig } from "./config.js";
export type { IssueTokensInput, TokenPair } from "./jwt.js";
