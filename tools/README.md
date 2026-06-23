# DID/VC Client Onboarding Tool

Generates a complete, deployable W3C DID/VC package for any agent-based organization. No bespoke engineering required — provide a domain and an agents roster, get a ready-to-deploy credential infrastructure.

## Prerequisites

Node.js 18+ and the project dependencies (`npm install` from the repo root).

## Usage

```bash
node tools/did-setup-client.mjs --domain <domain> --agents <agents.json> --out <output-dir>
```

| Flag | Required | Description |
|---|---|---|
| `--domain` | Yes (or in agents file) | Client domain, e.g. `acme.com` |
| `--agents` | Yes | Path to agents roster JSON file |
| `--out` | Yes | Output directory (created if it doesn't exist) |

## Agents file format

```json
{
  "companyName": "Acme Corp",
  "domain": "acme.com",
  "agents": [
    {
      "name": "ceo-agent",
      "displayName": "CEO Agent",
      "role": "ceo",
      "title": "Chief Executive Officer",
      "capabilities": ["strategic direction", "hiring", "governance"],
      "reportsTo": null,
      "canCreateAgents": true,
      "canSignTransactions": false
    }
  ]
}
```

**Required fields per agent:** `name`, `role`, `title`  
**Optional fields:** `displayName`, `capabilities`, `reportsTo` (agent name slug or full DID), `canCreateAgents`, `canSignTransactions`  
**Name constraint:** `name` must be lowercase alphanumeric with hyphens only (used as URL path segment)

See `tools/example-agents.json` for a complete multi-agent example.

## Example

```bash
# Using the bundled example
node tools/did-setup-client.mjs \
  --domain example.com \
  --agents tools/example-agents.json \
  --out ./example-output

# Verify a generated credential
node did/verify-credential.mjs ./example-output/credentials/ceo-agent-identity.jwt
```

## Output structure

```
<output-dir>/
├── .well-known/
│   └── did.json                    # Company DID document → deploy to /.well-known/did.json
├── agents/
│   └── <name>/
│       └── did.json                # Agent DID documents → deploy to /agents/<name>/did.json
├── schemas/
│   ├── <Slug>AgentIdentity.jsonld  # JSON-LD context for identity VCs
│   └── <Slug>AgentCapability.jsonld
├── status-list/
│   └── status-list-2021.json      # W3C Status List 2021 revocation scaffold
├── credentials/
│   ├── <name>-identity.jwt         # Signed identity VC-JWT (EdDSA, did:web)
│   └── <name>-capability.jwt       # Signed capability VC-JWT (EdDSA, did:web)
├── private-keys/                   # ⚠ NEVER deploy or commit
│   ├── .gitignore
│   ├── company.jwk.json
│   └── <name>.jwk.json
└── manifest.json                   # Deployment route guide
```

## Deployment

Serve everything except `private-keys/` from your domain root with `Content-Type: application/json`. The `manifest.json` file lists every required URL mapping.

| Local file | Public URL |
|---|---|
| `.well-known/did.json` | `https://example.com/.well-known/did.json` |
| `agents/<name>/did.json` | `https://example.com/agents/<name>/did.json` |
| `schemas/*.jsonld` | `https://example.com/schemas/*.jsonld` |
| `status-list/status-list-2021.json` | `https://example.com/status-list/status-list-2021.json` |

## Re-issuing credentials

Re-run the tool with the same `--domain` and `--agents` flags (and a new `--out` if you want to keep the old package). The tool always generates fresh key pairs — if you want to keep the existing keys, copy them from `private-keys/` before re-running.

## Revoking a credential

1. Set the bit at the credential's `statusListIndex` to `1` in `status-list/status-list-2021.json`
2. Redeploy the updated status list
3. Re-issue a replacement credential if needed

## What's not included

- `did:ethr` (Polygon) dual issuance — use `did/create-ethr-dids.mjs` and `did/issue-credentials.mjs` from the DZHC repo as a reference for adding blockchain DIDs
- On-chain registration — see `did/SETUP-GUIDE.md` Phase 2 for the `--register` flow
