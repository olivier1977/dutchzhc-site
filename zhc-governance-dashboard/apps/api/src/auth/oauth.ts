/**
 * OAuth2 / OIDC provider helpers.
 *
 * Supported providers:
 *   - Google (OpenID Connect — returns email + name + verified flag)
 *   - GitHub (OAuth2 — returns primary email + name)
 *
 * Flow (authorization code + PKCE for Google; plain code for GitHub):
 *   1. Browser hits  GET /auth/{provider}  → redirect to provider
 *   2. Provider redirects to GET /auth/{provider}/callback?code=...&state=...
 *   3. We exchange code for tokens, fetch user profile
 *   4. Find or create the user in DB                         ← TODO(DUTA-73)
 *   5. Assign a tenant and role                              ← TODO(DUTA-73)
 *   6. Issue our own JWT pair and set cookies
 *   7. Redirect browser to frontend with success
 *
 * TODO(DUTA-73): Steps 4-5 require the users/tenants/memberships schema.
 * Until then, `resolveUserFromOAuthProfile` is a stub that must be implemented
 * once the DB layer is available.
 */

import { nanoid } from "nanoid";
import type { OAuthProvider, Role } from "@zhc-governance/shared";
import { getAuthConfig } from "./config.js";

// ---------------------------------------------------------------------------
// Provider configuration
// ---------------------------------------------------------------------------

export function getGoogleOAuthConfig() {
  const cfg = getAuthConfig();
  return {
    clientId: cfg.GOOGLE_CLIENT_ID,
    clientSecret: cfg.GOOGLE_CLIENT_SECRET,
    callbackUrl: cfg.GOOGLE_CALLBACK_URL,
    scope: ["openid", "email", "profile"],
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    userinfoEndpoint: "https://www.googleapis.com/oauth2/v3/userinfo",
  };
}

export function getGithubOAuthConfig() {
  const cfg = getAuthConfig();
  return {
    clientId: cfg.GITHUB_CLIENT_ID,
    clientSecret: cfg.GITHUB_CLIENT_SECRET,
    callbackUrl: cfg.GITHUB_CALLBACK_URL,
    scope: ["read:user", "user:email"],
    authorizationEndpoint: "https://github.com/login/oauth/authorize",
    tokenEndpoint: "https://github.com/login/oauth/access_token",
    userinfoEndpoint: "https://api.github.com/user",
    emailsEndpoint: "https://api.github.com/user/emails",
  };
}

// ---------------------------------------------------------------------------
// Authorization URL generation
// ---------------------------------------------------------------------------

export interface AuthorizationUrlResult {
  url: string;
  /** CSRF state value — store in httpOnly cookie, validate in callback. */
  state: string;
}

export function buildGoogleAuthorizationUrl(): AuthorizationUrlResult {
  const config = getGoogleOAuthConfig();
  const state = nanoid(32);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    response_type: "code",
    scope: config.scope.join(" "),
    state,
    access_type: "offline",
    prompt: "consent",
  });
  return { url: `${config.authorizationEndpoint}?${params}`, state };
}

export function buildGithubAuthorizationUrl(): AuthorizationUrlResult {
  const config = getGithubOAuthConfig();
  const state = nanoid(32);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    scope: config.scope.join(" "),
    state,
  });
  return { url: `${config.authorizationEndpoint}?${params}`, state };
}

// ---------------------------------------------------------------------------
// Code exchange
// ---------------------------------------------------------------------------

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
}

async function exchangeCodeForToken(
  tokenEndpoint: string,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Token exchange failed: ${response.status} ${response.statusText}`,
    );
  }
  return response.json() as Promise<TokenResponse>;
}

// ---------------------------------------------------------------------------
// User profile fetching
// ---------------------------------------------------------------------------

export interface OAuthUserProfile {
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl?: string;
}

export async function fetchGoogleUserProfile(
  code: string,
): Promise<OAuthUserProfile> {
  const config = getGoogleOAuthConfig();
  const tokens = await exchangeCodeForToken(
    config.tokenEndpoint,
    config.clientId,
    config.clientSecret,
    code,
    config.callbackUrl,
  );

  const profileResp = await fetch(config.userinfoEndpoint, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileResp.ok)
    throw new Error("Failed to fetch Google user profile");

  const profile = (await profileResp.json()) as {
    sub: string;
    email: string;
    email_verified: boolean;
    name: string;
    picture?: string;
  };

  return {
    provider: "google",
    providerUserId: profile.sub,
    email: profile.email,
    emailVerified: profile.email_verified,
    name: profile.name,
    avatarUrl: profile.picture,
  };
}

export async function fetchGithubUserProfile(
  code: string,
): Promise<OAuthUserProfile> {
  const config = getGithubOAuthConfig();
  const tokens = await exchangeCodeForToken(
    config.tokenEndpoint,
    config.clientId,
    config.clientSecret,
    code,
    config.callbackUrl,
  );

  const headers = {
    Authorization: `Bearer ${tokens.access_token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "zhc-governance-dashboard/0.1",
  };

  const [userResp, emailsResp] = await Promise.all([
    fetch(config.userinfoEndpoint, { headers }),
    fetch(config.emailsEndpoint, { headers }),
  ]);
  if (!userResp.ok) throw new Error("Failed to fetch GitHub user profile");
  if (!emailsResp.ok) throw new Error("Failed to fetch GitHub user emails");

  const user = (await userResp.json()) as {
    id: number;
    login: string;
    name?: string;
    avatar_url?: string;
  };

  const emails = (await emailsResp.json()) as Array<{
    email: string;
    primary: boolean;
    verified: boolean;
  }>;

  const primaryEmail = emails.find((e) => e.primary && e.verified);
  if (!primaryEmail) {
    throw new Error(
      "GitHub account must have a verified primary email address",
    );
  }

  return {
    provider: "github",
    providerUserId: String(user.id),
    email: primaryEmail.email,
    emailVerified: primaryEmail.verified,
    name: user.name ?? user.login,
    avatarUrl: user.avatar_url,
  };
}

// ---------------------------------------------------------------------------
// User resolution (DB integration point)
// ---------------------------------------------------------------------------

export interface ResolvedUser {
  userId: string;
  tenantId: string;
  role: Role;
  name: string;
  email: string;
}

/**
 * Find or create a user based on their OAuth profile.
 *
 * TODO(DUTA-73): Implement this using the users, tenants, and oauth_accounts
 * tables defined in the DB schema.
 *
 * Logic:
 *   1. Look up `oauth_accounts` by (provider, providerUserId).
 *   2. If found → return the linked user's details and tenant membership.
 *   3. If not found by provider ID → look up by email (link accounts).
 *   4. If no user at all → create user + new tenant (first-time signup).
 *   5. Return { userId, tenantId, role, name, email }.
 *
 * The first user to sign up for a tenant is assigned `owner` role.
 * Subsequent invitations will be processed separately (invite flow).
 */
export async function resolveUserFromOAuthProfile(
  profile: OAuthUserProfile,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _db?: unknown,
): Promise<ResolvedUser> {
  // TODO(DUTA-73): replace stub with real DB lookup
  throw new Error(
    "resolveUserFromOAuthProfile is not yet implemented — requires DUTA-73 DB schema",
  );
}
