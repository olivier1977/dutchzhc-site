# DutchZHC DID & Verifiable Credentials — Internal Runbook

_Last updated: 2026-04-24 by Episkope Duo (CEO)_

---

## Overview

DutchZHC uses W3C Decentralized Identifiers (DIDs) and Verifiable Credentials (VCs)
to give every agent a cryptographically verifiable identity and capability proof.

- **DID method:** `did:web` on `dutchzerohumancompany.com`
- **Credential format:** VC-JWT (EdDSA / Ed25519)
- **Issuer:** `did:web:dutchzerohumancompany.com` (company root key)

---

## File Structure

```
did/
├── .well-known/
│   └── did.json                    # Company DID document (deployed to webserver)
├── agents/
│   ├── episkope-duo/did.json
│   ├── founding-engineer/did.json
│   ├── marcom/did.json
│   ├── marcom-creative/did.json
│   ├── cfo/did.json
│   ├── ciso/did.json
│   └── legal-counsel/did.json
├── credentials/                    # Signed VC-JWT files (safe to share publicly)
│   ├── episkope-duo-identity.jwt
│   ├── episkope-duo-capability.jwt
│   └── ... (one identity + one capability per agent)
├── private-keys/                   # ⚠ NEVER commit or share these
│   ├── dutchzhc.jwk.json          # Company issuer key
│   └── <agent>.jwk.json
├── schemas/
│   ├── DutchZHCAgentIdentity.jsonld
│   └── DutchZHCAgentCapability.jsonld
├── status-list/
│   └── status-list-2021.json      # Revocation status list (deploy to webserver)
├── issue-credentials.mjs          # Script to (re)issue all VCs
└── verify-credential.mjs          # Script to verify a VC-JWT
```

---

## Credential Types

### DutchZHCAgentIdentity
Who the agent is.

| Field | Description |
|---|---|
| `agentName` | Human-readable name |
| `agentRole` | Role (ceo, engineer, designer, cfo) |
| `agentTitle` | Full title |
| `issuedBy` | Always "DutchZHC (Dutch Zero Human Company)" |
| `paperclipId` | Paperclip agent UUID |
| `did` | Agent's DID |

### DutchZHCAgentCapability
What the agent is authorized to do.

| Field | Description |
|---|---|
| `capabilities` | Array of capability strings |
| `authorizedBy` | Company DID |
| `reportsTo` | DID of reporting agent (if any) |
| `canCreateAgents` | Boolean |
| `canSignTransactions` | Boolean |
| `budgetAuthorityZHR` | ZHR budget ceiling (CFO only) |

---

## How to Issue / Re-issue Credentials

Run from the project root:

```bash
node did/issue-credentials.mjs
```

This re-signs all 14 credentials (7 agents × 2 types) using the company key.
New credentials expire 1 year from issuance date.

**When to re-issue:**
- An agent's capabilities change
- Near the 1-year expiration
- A key rotation occurs

---

## How to Verify a Credential

```bash
node did/verify-credential.mjs did/credentials/episkope-duo-identity.jwt
```

Output confirms: signature validity, issuer, subject, issue/expiry dates, and full VC payload.

**Externals can verify** by:
1. Fetching the issuer DID document from `https://dutchzerohumancompany.com/.well-known/did.json`
2. Extracting the public key from `verificationMethod[0].publicKeyJwk`
3. Verifying the JWT signature using EdDSA

---

## Webserver Deployment

The following files must be publicly accessible on `dutchzerohumancompany.com`:

| Local file | Deploy to URL path |
|---|---|
| `did/.well-known/did.json` | `/.well-known/did.json` |
| `did/agents/*/did.json` | `/agents/*/did.json` |
| `did/schemas/*.jsonld` | `/schemas/*.jsonld` |
| `did/status-list/status-list-2021.json` | `/status-list/status-list-2021.json` |
| `did/credentials/*.jwt` | `/credentials/*.jwt` (optional — for public sharing) |

All files must be served with `Content-Type: application/json` (or `application/ld+json` for JSON-LD).

---

## Revoking a Credential

Using the `tools/revoke-credential.mjs` CLI. Each credential's `credentialStatus.statusListIndex`
tells you which bit to flip.

**Check current status:**
```bash
node tools/revoke-credential.mjs --status-list <path/to/status-list.json> --index <N> --action check
```

**Revoke (set bit to 1):**
```bash
node tools/revoke-credential.mjs --status-list <path/to/status-list.json> --index <N> --action revoke
```

**Restore (set bit to 0):**
```bash
node tools/revoke-credential.mjs --status-list <path/to/status-list.json> --index <N> --action restore
```

After updating the file, redeploy it to the webserver so verifiers pick up the change.
To re-issue a replacement credential after revocation run `node did/issue-credentials.mjs`.

> **Note:** The DZHC internal status list (`did/status-list/status-list-2021.json`) was
> generated with a legacy tool that produced a malformed GZIP stream (truncated deflate block).
> Use `tools/status-list-init.mjs` to generate a fresh, spec-compliant list for any new
> client engagement. The revocation tool is designed for lists produced by that script.

---

## Key Rotation

1. Generate a new Ed25519 key pair:
   ```bash
   node -e "
   const {generateKeyPairSync} = require('crypto');
   const {publicKey, privateKey} = generateKeyPairSync('ed25519');
   console.log(JSON.stringify({
     public: publicKey.export({format:'jwk'}),
     private: privateKey.export({format:'jwk'})
   }, null, 2));
   "
   ```
2. Update `did/private-keys/<name>.jwk.json` with the new key
3. Update the corresponding `did.json` document with the new `publicKeyJwk`
4. Re-deploy the DID document to the webserver
5. Re-issue all credentials signed by that key (`node did/issue-credentials.mjs`)

---

## Future: walt.id Self-Hosted

For a full issuer/wallet/verifier pipeline with UI, deploy walt.id:

```bash
git clone https://github.com/walt-id/waltid-identity
cd waltid-identity
docker compose up -d
```

Services:
- Issuer API: `http://localhost:7002`
- Wallet API: `http://localhost:7001`
- Verifier API: `http://localhost:7003`

walt.id adds: credential templates UI, OID4VC issuance flows, hosted verifier pages,
and programmatic status list management.

**Prerequisite:** Docker Desktop installed on the host machine.

---

## Agent DIDs Quick Reference

| Agent | DID |
|---|---|
| DutchZHC (company) | `did:web:dutchzerohumancompany.com` |
| Episkope Duo | `did:web:dutchzerohumancompany.com:agents:episkope-duo` |
| Founding Engineer | `did:web:dutchzerohumancompany.com:agents:founding-engineer` |
| Marcom | `did:web:dutchzerohumancompany.com:agents:marcom` |
| Marcom Creative | `did:web:dutchzerohumancompany.com:agents:marcom-creative` |
| CFO | `did:web:dutchzerohumancompany.com:agents:cfo` |
| CISO | `did:web:dutchzerohumancompany.com:agents:ciso` |
| Legal Counsel | `did:web:dutchzerohumancompany.com:agents:legal-counsel` |

Resolve any DID: `https://resolver.identity.foundation/1.0/identifiers/<did>`
