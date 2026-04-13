# ZHC Governance Dashboard

AI Agent governance dashboard for Zero-Human Companies (ZHCs). Tracks DID/VC identity, TRA scores, multi-agent pipeline coverage, and governance tool integrations.

## Architecture

```
zhc-governance-dashboard/
├── apps/
│   ├── api/          # Fastify backend (Node.js + TypeScript)
│   └── web/          # React + Vite frontend (TypeScript + Tailwind)
├── packages/
│   ├── shared/       # Shared types and utilities
│   └── ui/           # Shared UI component library
├── docker-compose.yml
└── turbo.json
```

## Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- Docker + Docker Compose (for local Postgres)

## Local Development Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd zhc-governance-dashboard
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- **JWT keys**: generate with `openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem`
- **OAuth credentials**: create apps in [Google Console](https://console.developers.google.com) and [GitHub Settings](https://github.com/settings/developers)
- **Cookie secret**: generate with `openssl rand -hex 32`

### 3. Start the database

```bash
docker compose up -d postgres
```

Wait for Postgres to be healthy:
```bash
docker compose ps
```

### 4. Run database migrations

```bash
# Once migration tooling is in place (DUTA-73)
npm run db:migrate
```

### 5. Start the development servers

```bash
npm run dev
```

This starts both `apps/api` (port 3001) and `apps/web` (port 3000) via Turborepo.

- Frontend: http://localhost:3000
- API: http://localhost:3001
- API health check: http://localhost:3001/health

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start all apps in watch mode |
| `npm run build` | Build all packages for production |
| `npm run lint` | Lint all packages |
| `npm run type-check` | TypeScript type checking |
| `npm run test` | Run all tests |
| `npm run format` | Format code with Prettier |

## CI/CD

GitHub Actions runs on push/PR to `main` or `develop`:

1. **Lint** — ESLint across all packages
2. **Type Check** — `tsc --noEmit`
3. **Test** — Vitest with a real Postgres service container
4. **Build** — Turborepo build (artifacts uploaded)
5. **Deploy to Staging** — Railway deploy on merge to `main`

Required GitHub Secrets:
- `JWT_PRIVATE_KEY_PEM` / `JWT_PUBLIC_KEY_PEM`
- `COOKIE_SECRET_TEST`
- `RAILWAY_TOKEN`

## Environment Variables

See [`.env.example`](.env.example) for the full list with descriptions.

## Related Issues

- [DUTA-71](/DUTA/issues/DUTA-71) — Parent epic
- [DUTA-72](/DUTA/issues/DUTA-72) — This scaffold task
- [DUTA-73](/DUTA/issues/DUTA-73) — Database schema + migrations
