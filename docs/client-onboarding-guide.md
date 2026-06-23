# DID & Verifiable Credentials — Client Onboarding Guide

_Prepared by DZHC · Version 1.0 · 2026-06-23_

---

## What This Guide Covers

This guide walks you through everything needed to deploy W3C Decentralized Identifiers (DIDs)
and Verifiable Credentials (VCs) for your organisation and its agents.

**What you will have at the end:**

- A company-level `did:web` identity anchored to your own domain
- One `did:web` identity per agent
- Signed Verifiable Credential JWTs per agent (identity proof + capability proof), valid for 1 year
- A publicly accessible credential revocation list
- Scripts to issue, re-issue, and verify credentials

**Technology choices (decided, no action needed from you):**

| Layer | Choice | Why |
|---|---|---|
| DID method | `did:web` | No blockchain required; resolves over standard HTTPS |
| Signature algorithm | EdDSA (Ed25519) | Fast, compact, widely supported |
| Credential format | VC-JWT | W3C standard; verifiable by any JWT library |

---

## Part 1 — Pre-Engagement Checklist

A non-technical stakeholder can complete this checklist before the first technical session.
All items below are required for DZHC to proceed.

### 1.1 Domain Control

- [ ] You own a domain (e.g. `yourcompany.com`) and can make DNS changes
- [ ] You can create or update files in the web root of that domain
- [ ] The domain is live and reachable over the public internet

### 1.2 HTTPS

- [ ] The domain has a valid TLS/SSL certificate (`https://yourcompany.com` loads without a browser warning)
- [ ] HTTPS is the default — HTTP requests redirect to HTTPS

> **Why this matters:** `did:web` resolves your DID document by fetching
> `https://yourcompany.com/.well-known/did.json`. If HTTPS is broken or absent,
> your DID cannot be verified by any third party.

### 1.3 Static File Hosting

- [ ] You can upload and serve static JSON files from your domain root
- [ ] Your hosting provider allows you to set the `Content-Type: application/json` response header
  _(most static hosts and CDNs support this — if unsure, ask your hosting provider)_

### 1.4 Agent Roster

- [ ] You have a list of all agents that need credentials (name, role, and a short slug per agent)
- [ ] You have decided which agent(s), if any, will have elevated capabilities
  (e.g. ability to sign transactions, create sub-agents, or hold a budget authority)

### 1.5 Secret Key Storage

- [ ] You have a secure place to store private key files that will **never** be committed to version
  control or shared over email (e.g. a secrets manager, an encrypted vault, or an offline backup)

---

## Part 2 — Responsibilities

### What DZHC Delivers

| Deliverable | Description |
|---|---|
| Company DID document | `did.json` anchored to your domain |
| Agent DID documents | One `did.json` per agent |
| Credential schemas | JSON-LD context files defining your identity and capability fields |
| Revocation status list | W3C Status List 2021 file, pre-populated as all-active |
| Issuance script | `issue-credentials.mjs` — signs and writes all VC-JWTs |
| Verification script | `verify-credential.mjs` — validates any VC-JWT from the command line |
| Deployment manifest | Exact file → URL mapping for your web server |
| This guide | Step-by-step instructions for every maintenance task |

### What the Client Controls

| Responsibility | Notes |
|---|---|
| Domain and DNS | DZHC does not have access to your registrar or DNS provider |
| Web server / hosting | You upload and serve the static files |
| Private keys | Generated once; stored and rotated by you |
| Agent definitions | You decide agent names, roles, and capability scopes |
| Annual re-issuance | Credentials expire after 1 year; you run the issuance script |
| Revocation decisions | Only you decide when and whether to revoke a credential |

---

## Part 3 — Step-by-Step Technical Setup

> **Who should follow Part 3:** A developer or DevOps engineer with access to the domain's
> web server and a terminal with Node.js 18+ installed.
> Non-technical stakeholders only need Part 1 and Part 2.

### Step 1 — Install dependencies

```bash
npm install jose
```

`jose` handles Ed25519 key generation, JWT signing, and verification with no additional SDK.

For optional `did:ethr` (Polygon blockchain) support, also install:

```bash
npm install ethers ethr-did did-jwt did-jwt-vc did-resolver ethr-did-resolver
```

---

### Step 2 — Generate your company key pair

Run this one-liner to generate an Ed25519 key pair in JWK format:

```bash
node -e "
const {generateKeyPairSync} = require('crypto');
const {publicKey, privateKey} = generateKeyPairSync('ed25519');
console.log(JSON.stringify({
  publicKeyJwk:  publicKey.export({format:'jwk'}),
  privateKeyJwk: privateKey.export({format:'jwk'})
}, null, 2));
"
```

Save the output to `did/private-keys/yourcompany.jwk.json` and add a `did` field:

```json
{
  "did": "did:web:yourcompany.com",
  "publicKeyJwk":  { "kty": "OKP", "crv": "Ed25519", "x": "..." },
  "privateKeyJwk": { "kty": "OKP", "crv": "Ed25519", "x": "...", "d": "..." }
}
```

> **Security rule:** Add `did/private-keys/` to `.gitignore` immediately.
> Never commit, email, or paste these files anywhere.

---

### Step 3 — Create the company DID document

Create `did/.well-known/did.json`, replacing `yourcompany.com` with your actual domain:

```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:web:yourcompany.com",
  "verificationMethod": [
    {
      "id": "did:web:yourcompany.com#key-1",
      "type": "JsonWebKey2020",
      "controller": "did:web:yourcompany.com",
      "publicKeyJwk": {
        "kty": "OKP",
        "crv": "Ed25519",
        "x": "<your-public-key-x-value>"
      }
    }
  ],
  "authentication": ["did:web:yourcompany.com#key-1"],
  "assertionMethod": ["did:web:yourcompany.com#key-1"]
}
```

This file must ultimately be served at `https://yourcompany.com/.well-known/did.json`.

---

### Step 4 — Create agent DID documents

For each agent, create `did/agents/<agent-slug>/did.json`.

Example for an agent with slug `ceo`:

```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:web:yourcompany.com:agents:ceo",
  "verificationMethod": [
    {
      "id": "did:web:yourcompany.com:agents:ceo#key-1",
      "type": "JsonWebKey2020",
      "controller": "did:web:yourcompany.com",
      "publicKeyJwk": {
        "kty": "OKP",
        "crv": "Ed25519",
        "x": "<company-public-key-or-agent-specific-key>"
      }
    }
  ],
  "authentication": ["did:web:yourcompany.com:agents:ceo#key-1"],
  "assertionMethod": ["did:web:yourcompany.com:agents:ceo#key-1"]
}
```

**URL resolution rule:** `did:web:yourcompany.com:agents:ceo` resolves to
`https://yourcompany.com/agents/ceo/did.json` — colons in the DID path become forward slashes.

---

### Step 5 — Define credential schemas

Create two JSON-LD context files in `did/schemas/`. These define the fields that will appear
in your VCs. DZHC provides starter templates; you customise the field names and URLs to match
your organisation.

**Identity schema** (`did/schemas/YourCompanyAgentIdentity.jsonld`) — who the agent is:

```json
{
  "@context": {
    "@version": 1.1,
    "YourCompanyAgentIdentity": "https://yourcompany.com/schemas/YourCompanyAgentIdentity#",
    "agentName":  "YourCompanyAgentIdentity:agentName",
    "agentRole":  "YourCompanyAgentIdentity:agentRole",
    "agentTitle": "YourCompanyAgentIdentity:agentTitle",
    "issuedBy":   "YourCompanyAgentIdentity:issuedBy",
    "did":        "YourCompanyAgentIdentity:did"
  }
}
```

**Capability schema** (`did/schemas/YourCompanyAgentCapability.jsonld`) — what the agent may do:

```json
{
  "@context": {
    "@version": 1.1,
    "YourCompanyAgentCapability": "https://yourcompany.com/schemas/YourCompanyAgentCapability#",
    "agentName":           "YourCompanyAgentCapability:agentName",
    "agentRole":           "YourCompanyAgentCapability:agentRole",
    "authorizedBy":        "YourCompanyAgentCapability:authorizedBy",
    "capabilities":        "YourCompanyAgentCapability:capabilities",
    "reportsTo":           "YourCompanyAgentCapability:reportsTo",
    "canCreateAgents":     "YourCompanyAgentCapability:canCreateAgents",
    "canSignTransactions": "YourCompanyAgentCapability:canSignTransactions"
  }
}
```

Add or remove fields to match your governance model. DZHC will finalise the schema with you
before issuance.

---

### Step 6 — Create the revocation status list

Use the provided CLI tool to generate a fresh Status List 2021 file for your domain:

```bash
node tools/status-list-init.mjs --domain yourcompany.com --output ./status-list.json
```

This creates `./status-list.json` — a W3C Status List 2021 file with a 131,072-slot all-active
bitstring, ready to deploy. Move it to `did/status-list/status-list-2021.json` in your repository.

**Options:**

| Flag | Description |
|---|---|
| `--domain` | Your domain (required) |
| `--output` | Output path (default: `./status-list.json`) |
| `--purpose` | `revocation` (default) or `suspension` |
| `--issuer` | Override the issuer DID (default: `did:web:<domain>`) |

Each VC issued will be assigned a unique `statusListIndex` so it can be individually revoked
without affecting other credentials.

---

### Step 7 — Issue credentials (CLI tool)

Run the issuance script that DZHC provides:

```bash
node did/issue-credentials.mjs
```

The script:
1. Reads your company private key from `did/private-keys/yourcompany.jwk.json`
2. Builds identity and capability VC payloads for each agent
3. Signs each payload as a VC-JWT using EdDSA
4. Writes one `<agent>-identity.jwt` and one `<agent>-capability.jwt` per agent to `did/credentials/`

Expected output:

```
✓ Identity VC issued: ceo-identity.jwt
✓ Capability VC issued: ceo-capability.jwt
... (one pair per agent)
All credentials issued to did/credentials/
```

Verify a credential immediately after issuance:

```bash
node did/verify-credential.mjs did/credentials/ceo-identity.jwt
```

---

### Step 8 — Deploy to your web server

Upload the following files so they are publicly reachable. Serve all JSON files with
`Content-Type: application/json` (or `application/ld+json` for schema files).

| Local path | Public URL |
|---|---|
| `did/.well-known/did.json` | `https://yourcompany.com/.well-known/did.json` |
| `did/agents/*/did.json` | `https://yourcompany.com/agents/*/did.json` |
| `did/schemas/*.jsonld` | `https://yourcompany.com/schemas/*.jsonld` |
| `did/status-list/status-list-2021.json` | `https://yourcompany.com/status-list/status-list-2021.json` |
| `did/credentials/*.jwt` _(optional)_ | `https://yourcompany.com/credentials/*.jwt` |

**Do not upload** anything from `did/private-keys/`.

---

### Step 9 — Verify public resolution

Once deployed, anyone can resolve and verify your DIDs without any private key access:

```bash
# Resolve the company DID
curl https://resolver.identity.foundation/1.0/identifiers/did:web:yourcompany.com

# Resolve an agent DID
curl https://resolver.identity.foundation/1.0/identifiers/did:web:yourcompany.com:agents:ceo
```

A successful response returns the full DID document in JSON.

---

## Part 4 — File Structure Reference

After completing setup, your `did/` folder will look like this:

```
did/
├── .well-known/
│   └── did.json                         # Company DID document → deploy to /.well-known/did.json
├── agents/
│   ├── ceo/did.json
│   ├── engineer/did.json
│   └── ... (one folder per agent)
├── credentials/                         # Signed VC-JWTs — safe to share publicly
│   ├── ceo-identity.jwt
│   ├── ceo-capability.jwt
│   └── ...
├── private-keys/                        # ⚠ NEVER commit or share
│   └── yourcompany.jwk.json
├── schemas/
│   ├── YourCompanyAgentIdentity.jsonld
│   └── YourCompanyAgentCapability.jsonld
├── status-list/
│   └── status-list-2021.json           # Revocation list → deploy to /status-list/
├── issue-credentials.mjs               # Run to (re)issue all VCs
└── verify-credential.mjs               # Run to verify any VC-JWT
```

---

## Part 5 — Ongoing Maintenance

### Re-issuing credentials (annual or after a role change)

```bash
node did/issue-credentials.mjs
```

Redeploy the updated `.jwt` files to your web server. Credentials are valid for 1 year from
the date the script is run.

**Trigger re-issuance when:**
- An agent's role or capabilities change
- Credentials are within 30 days of expiry
- A key rotation has occurred

---

### Revoking a credential

Use the provided revocation CLI tool. You never need to manually edit the bitstring.

```bash
# Revoke credential at index 3
node tools/revoke-credential.mjs \
  --status-list did/status-list/status-list-2021.json \
  --index 3 \
  --action revoke

# Restore (un-revoke) that same credential
node tools/revoke-credential.mjs \
  --status-list did/status-list/status-list-2021.json \
  --index 3 \
  --action restore

# Check the current status without modifying anything
node tools/revoke-credential.mjs \
  --status-list did/status-list/status-list-2021.json \
  --index 3 \
  --action check
```

The tool updates `encodedList` in place and prints a confirmation. After running it:

1. Redeploy the updated status list file to your web server
2. Optionally re-issue a replacement credential for the same agent

Verifiers who check the `credentialStatus` field will see the revocation within minutes of redeployment.

**Options:**

| Flag | Description |
|---|---|
| `--status-list` | Path to the status list JSON file (required) |
| `--index` | Credential's `statusListIndex` (0-based integer, required) |
| `--action` | `revoke`, `restore`, or `check` (required) |
| `--output` | Write to a different file instead of updating in place |

---

### Key rotation

1. Generate a new Ed25519 key pair (repeat Step 2)
2. Replace the contents of `did/private-keys/yourcompany.jwk.json`
3. Update `publicKeyJwk` in `did/.well-known/did.json` and all agent `did.json` files
4. Redeploy all updated DID documents
5. Re-issue all credentials: `node did/issue-credentials.mjs`

> Old credentials signed with the previous key become unverifiable immediately after the DID
> document is updated. Re-issue before rotating the deployed DID document if continuity matters.

---

## Part 6 — Optional: did:ethr on Polygon (Blockchain DIDs)

`did:ethr` gives each agent a second identity anchored on-chain (Polygon mainnet).
Both identities coexist — `did:web` is the primary; `did:ethr` is the on-chain complement.

**Additional prerequisites:** Each wallet address needs a small MATIC balance for gas.

```bash
# Install additional dependencies
npm install ethers ethr-did did-jwt did-jwt-vc did-resolver ethr-did-resolver

# Generate Ethereum wallets for each entity
node did/create-ethr-dids.mjs

# Issue dual VCs (did:web + did:ethr)
node did/issue-credentials.mjs
```

This produces four credential files per agent instead of two:

| File | Algorithm | Issuer |
|---|---|---|
| `<agent>-identity.jwt` | EdDSA | `did:web:…` |
| `<agent>-capability.jwt` | EdDSA | `did:web:…` |
| `<agent>-identity-ethr.jwt` | ES256K | `did:ethr:0x89:…` |
| `<agent>-capability-ethr.jwt` | ES256K | `did:ethr:0x89:…` |

Contact DZHC before enabling this option — wallet funding and on-chain registration require
coordination.

---

## Part 7 — Getting Help

| Topic | Contact |
|---|---|
| Pre-engagement questions | Reach out via your DZHC account contact |
| Schema design | DZHC can draft schemas based on your agent roster |
| Hosting configuration | DZHC can advise; your DevOps team deploys |
| Key storage best practices | DZHC recommends a secrets manager (e.g. Vault, AWS Secrets Manager) |
| Verification failures | Share the JWT content (never the private key) for diagnosis |

---

_For DZHC's internal operational procedures (key rotation schedules, re-issuance workflows,
incident response), see the internal `did/RUNBOOK.md`._
