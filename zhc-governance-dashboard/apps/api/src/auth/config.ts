/**
 * Auth configuration — all values sourced from environment variables.
 * Never hard-code secrets here; this file only reads process.env.
 */

import { z } from "zod";

const EnvSchema = z.object({
  // JWT
  JWT_PRIVATE_KEY_PEM: z
    .string()
    .min(100, "JWT_PRIVATE_KEY_PEM must be a PEM-encoded RS256 private key"),
  JWT_PUBLIC_KEY_PEM: z
    .string()
    .min(100, "JWT_PUBLIC_KEY_PEM must be a PEM-encoded RS256 public key"),
  JWT_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().default(900), // 15 min
  JWT_REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().default(604800), // 7 days
  JWT_ISSUER: z.string().default("https://governance.dutchzhc.com"),

  // Cookies
  COOKIE_SECRET: z.string().min(32, "COOKIE_SECRET must be at least 32 chars"),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z
    .string()
    .transform((v) => v !== "false")
    .default("true"),

  // OAuth2 — Google
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z
    .string()
    .url()
    .default("http://localhost:3001/auth/google/callback"),

  // OAuth2 — GitHub
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_CALLBACK_URL: z
    .string()
    .url()
    .default("http://localhost:3001/auth/github/callback"),

  // App
  APP_FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

let _config: z.infer<typeof EnvSchema> | null = null;

/** Parse and validate env vars once; throws on startup if any are missing. */
export function getAuthConfig(): z.infer<typeof EnvSchema> {
  if (!_config) {
    const result = EnvSchema.safeParse(process.env);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      throw new Error(`Auth configuration error:\n${issues}`);
    }
    _config = result.data;
  }
  return _config;
}
