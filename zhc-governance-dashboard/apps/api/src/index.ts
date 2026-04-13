/**
 * zhc-governance-dashboard API server entry point.
 *
 * TODO(DUTA-72): This skeleton will be expanded once the monorepo scaffold
 * and CI pipeline are fully wired up.
 *
 * Security measures applied at the server level:
 *   - @fastify/helmet  — security headers (CSP, HSTS, X-Frame-Options, etc.)
 *   - @fastify/cors    — origin allowlist, credentials support
 *   - @fastify/rate-limit — brute-force protection on auth endpoints
 *   - @fastify/cookie  — signed cookie parsing required for httpOnly auth cookies
 */

import Fastify from "fastify";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./auth/index.js";
import { agentRoutes } from "./routes/agents.js";
import { processRoutes } from "./routes/processes.js";
import { integrationRoutes } from "./routes/integrations.js";
import { traRoutes } from "./routes/tra.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { getAuthConfig } from "./auth/config.js";
import { closeDb } from "./db/index.js";

async function buildApp() {
  const cfg = getAuthConfig();
  const isProduction = cfg.NODE_ENV === "production";

  const app = Fastify({
    logger: {
      level: isProduction ? "warn" : "info",
      // In production, avoid logging authorization headers
      redact: ["req.headers.authorization", "req.headers.cookie"],
    },
    trustProxy: isProduction,
  });

  // ---------------------------------------------------------------------------
  // Plugins
  // ---------------------------------------------------------------------------

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // tighten after CSP nonce support
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    hsts: isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  });

  await app.register(cors, {
    origin: cfg.APP_FRONTEND_URL,
    credentials: true, // required for httpOnly cookies cross-origin
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  await app.register(rateLimit, {
    global: false, // apply per-route; auth routes have their own limits
  });

  await app.register(cookie, {
    secret: cfg.COOKIE_SECRET,
  });

  // ---------------------------------------------------------------------------
  // Auth routes — with dedicated rate limiting
  // ---------------------------------------------------------------------------
  await app.register(authRoutes);

  // ---------------------------------------------------------------------------
  // Feature routes
  // ---------------------------------------------------------------------------
  await app.register(agentRoutes);
  await app.register(processRoutes);
  await app.register(integrationRoutes);
  await app.register(traRoutes);
  await app.register(dashboardRoutes);

  // Apply rate limiting specifically to auth endpoints
  app.addHook("onRoute", (routeOptions) => {
    if (routeOptions.url.startsWith("/auth/")) {
      routeOptions.config = {
        ...routeOptions.config,
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      };
    }
  });

  // ---------------------------------------------------------------------------
  // Health check
  // ---------------------------------------------------------------------------
  app.get("/health", async () => ({ status: "ok" }));

  return app;
}

async function start() {
  const app = await buildApp();

  const shutdown = async () => {
    await app.close();
    await closeDb();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  try {
    await app.listen({ port: 3001, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    await closeDb();
    process.exit(1);
  }
}

start();
