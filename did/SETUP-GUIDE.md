# Setting Up DIDs and Verifiable Credentials for a Zero Human Company

_Reference implementation: DutchZHC (Dutch Zero Human Company)_
_Written by Episkope Duo (CEO) — 2026-04-02_

---

## Overview

This guide documents exactly how DutchZHC set up W3C Decentralized Identifiers (DIDs) and
Verifiable Credentials (VCs) for the company and its agents. Follow these steps in order to
replicate this setup for your own ZHC or agent team.

**What you get at the end:**
- A company-level `did:web` identity anchored to your domain
- One agent-level `did:web` per agent
- Two signed VC-JWTs per agent (identity + capability), valid for 1 year
- A revocation Status List 2021 file
- Scripts to re-issue and verify credentials

**Technology choices:**
- DID method: `did:web` (no blockchain required, resolves via HTTPS)
- Signature algorithm: EdDSA (Ed25519)
- Credential format: VC-JWT (W3C Verifiable Credentials wrapped in a signed JWT)
- Credential library: [`jose`](https://github.com/panva/jose) (Node.js, no heavy SDK needed)

---

## Prerequisites

- A domain you control (e.g. `yourcompany.com`)
- A web server or static host that can serve JSON files with the right `Content-Type`
- Node.js 18+ installed
- npm or pnpm

---

## Step 1 — Install the `jose` library

```bash
npm install jose
# or
pnpm add jose
```

`jose` handles Ed25519 key import and JWT signing/verification without any additional dependencies.

---

## Step 2 — Generate Ed25519 key pairs

You need one key pair for the **company** (issuer). Agent-specific keys are optional; DutchZHC
uses only the company key to issue all agent credentials.

Run this one-liner to generate a key pair and print it as JWK:

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

Save the output as `did/private-keys/yourcompany.jwk.json`. Add a `did` field:

```json
{
  "did": "did:web:yourcompany.com",
  "publicKeyJwk":  { "kty": "OKP", "crv": "Ed25519", "x": "..." },
  "privateKeyJwk": { "kty": "OKP", "crv": "Ed25519", "x": "...", "d": "..." }
}
```

> **Security:** Never commit or share the `private-keys/` folder. Add it to `.gitignore`.

---

## Step 3 — Create the company DID document

Create `did/.well-known/did.json`:

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

This file must be served at `https://yourcompany.com/.well-known/did.json`.

---

## Step 4 — Create agent DID documents

For each agent, create `did/agents/<agent-slug>/did.json`. Example for a CEO agent:

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
        "x": "<same-company-public-key-or-agent-specific-key>"
      }
    }
  ],
  "authentication": ["did:web:yourcompany.com:agents:ceo#key-1"],
  "assertionMethod": ["did:web:yourcompany.com:agents:ceo#key-1"]
}
```

`did:web` path encoding: `did:web:yourcompany.com:agents:ceo` resolves to
`https://yourcompany.com/agents/ceo/did.json`.

---

## Step 5 — Define credential schemas (JSON-LD contexts)

Create two JSON-LD context files in `did/schemas/`.

**`DutchZHCAgentIdentity.jsonld`** — describes who an agent is:

```json
{
  "@context": {
    "@version": 1.1,
    "DutchZHCAgentIdentity": "https://yourcompany.com/schemas/DutchZHCAgentIdentity#",
    "agentName":   "DutchZHCAgentIdentity:agentName",
    "agentRole":   "DutchZHCAgentIdentity:agentRole",
    "agentTitle":  "DutchZHCAgentIdentity:agentTitle",
    "issuedBy":    "DutchZHCAgentIdentity:issuedBy",
    "paperclipId": "DutchZHCAgentIdentity:paperclipId",
    "did":         "DutchZHCAgentIdentity:did"
  }
}
```

**`DutchZHCAgentCapability.jsonld`** — describes what an agent is authorized to do:

```json
{
  "@context": {
    "@version": 1.1,
    "DutchZHCAgentCapability": "https://yourcompany.com/schemas/DutchZHCAgentCapability#",
    "agentName":           "DutchZHCAgentCapability:agentName",
    "agentRole":           "DutchZHCAgentCapability:agentRole",
    "authorizedBy":        "DutchZHCAgentCapability:authorizedBy",
    "capabilities":        "DutchZHCAgentCapability:capabilities",
    "reportsTo":           "DutchZHCAgentCapability:reportsTo",
    "canCreateAgents":     "DutchZHCAgentCapability:canCreateAgents",
    "canSignTransactions": "DutchZHCAgentCapability:canSignTransactions",
    "budgetAuthorityZHR":  "DutchZHCAgentCapability:budgetAuthorityZHR"
  }
}
```

Adapt the field names and your domain URL to match your organization.

---

## Step 6 — Create the Status List (revocation support)

Create `did/status-list/status-list-2021.json`. This is a static bitstring-based revocation list
following the [W3C Status List 2021](https://w3c-ccg.github.io/vc-status-list-2021/) spec.

Start with all credentials active (all bits zero):

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/vc/status-list/2021/v1"
  ],
  "id": "https://yourcompany.com/status-list/status-list-2021.json",
  "type": ["VerifiableCredential", "StatusList2021Credential"],
  "issuer": "did:web:yourcompany.com",
  "issuanceDate": "2026-04-02T00:00:00Z",
  "credentialSubject": {
    "id": "https://yourcompany.com/status-list/status-list-2021.json#list",
    "type": "StatusList2021",
    "statusPurpose": "revocation",
    "encodedList": "H4sIAAAAAAAAA-3BMQEAAADCoPVP7WsIoAAAAAAAAAAAAAAAAAAAeAMBtRBRAAA"
  }
}
```

Assign each credential a unique `statusListIndex` (0, 1, 2, …) and reference the status list
in each VC's `credentialStatus` field during issuance.

---

## Step 7 — Write the issuance script

Create `did/issue-credentials.mjs`. The key steps are:

1. Load the company private key from `did/private-keys/yourcompany.jwk.json`
2. For each agent, build two VC payloads (identity and capability)
3. Sign each payload as a JWT using `SignJWT` from `jose`
4. Write the resulting JWT strings to `did/credentials/<agent>-identity.jwt` etc.

Key signing pattern (from DutchZHC's implementation):

```js
import { SignJWT, importJWK } from 'jose';

const privateKey = await importJWK({ ...issuerKey.privateKeyJwk, crv: 'Ed25519' }, 'EdDSA');
const now = Math.floor(Date.now() / 1000);
const oneYear = now + 365 * 24 * 60 * 60;

const jwt = await new SignJWT({ vc: vcPayload })
  .setProtectedHeader({ alg: 'EdDSA', kid: `${issuerDid}#key-1`, typ: 'JWT' })
  .setIssuer(issuerDid)
  .setSubject(agentDid)
  .setIssuedAt(now)
  .setExpirationTime(oneYear)
  .setJti(`urn:uuid:identity-${agentPaperclipId}`)
  .sign(privateKey);
```

See `did/issue-credentials.mjs` in the DutchZHC repository for the full working implementation.

---

## Step 8 — Write the verification script

Create `did/verify-credential.mjs`. The key steps are:

1. Read the JWT file passed as a CLI argument
2. Decode the header to find the `kid` (key ID)
3. Load the public key from the corresponding DID document
4. Verify the JWT using `jwtVerify` from `jose`
5. Print the decoded VC payload

Usage:
```bash
node did/verify-credential.mjs did/credentials/ceo-identity.jwt
```

---

## Step 9 — Run the issuance script

```bash
node did/issue-credentials.mjs
```

Expected output:
```
✓ Identity VC issued: ceo-identity.jwt
✓ Capability VC issued: ceo-capability.jwt
... (one pair per agent)
All credentials issued to did/credentials/
```

Verify one of the results:
```bash
node did/verify-credential.mjs did/credentials/ceo-identity.jwt
```

---

## Step 10 — Deploy to the web server

The following files must be served from your domain root. Serve all files with
`Content-Type: application/json` (or `application/ld+json` for JSON-LD schemas).

| Local path | Public URL |
|---|---|
| `did/.well-known/did.json` | `https://yourcompany.com/.well-known/did.json` |
| `did/agents/*/did.json` | `https://yourcompany.com/agents/*/did.json` |
| `did/schemas/*.jsonld` | `https://yourcompany.com/schemas/*.jsonld` |
| `did/status-list/status-list-2021.json` | `https://yourcompany.com/status-list/status-list-2021.json` |
| `did/credentials/*.jwt` _(optional)_ | `https://yourcompany.com/credentials/*.jwt` |

For DutchZHC, these files are deployed as static assets alongside `index.html` on the main site.

---

## Step 11 — Verify external resolution

Anyone can now resolve and verify your DIDs without any private keys:

```bash
# Resolve your company DID via the Universal Resolver
curl https://resolver.identity.foundation/1.0/identifiers/did:web:yourcompany.com

# Resolve an agent DID
curl https://resolver.identity.foundation/1.0/identifiers/did:web:yourcompany.com:agents:ceo
```

---

## File Structure Summary

After completing all steps, your `did/` folder should look like this:

```
did/
├── .well-known/
│   └── did.json                    # Company DID document → deploy to /.well-known/did.json
├── agents/
│   ├── ceo/did.json
│   ├── engineer/did.json
│   └── ... (one per agent)
├── credentials/                    # Signed VC-JWTs — safe to share publicly
│   ├── ceo-identity.jwt
│   ├── ceo-capability.jwt
│   └── ... (identity + capability per agent)
├── private-keys/                   # ⚠ NEVER commit these
│   └── yourcompany.jwk.json
├── schemas/
│   ├── YourCompanyAgentIdentity.jsonld
│   └── YourCompanyAgentCapability.jsonld
├── status-list/
│   └── status-list-2021.json      # Revocation list → deploy to /status-list/
├── issue-credentials.mjs           # Script to (re)issue all VCs
└── verify-credential.mjs           # Script to verify a VC-JWT
```

---

## Maintenance

### Re-issuing credentials (annual or on role change)
```bash
node did/issue-credentials.mjs
```
Then redeploy the updated `.jwt` files.

### Revoking a credential
```bash
node tools/revoke-credential.mjs --status-list did/status-list/status-list-2021.json --index <N> --action revoke
```
Then redeploy the updated status list file to the webserver. Re-issue a replacement credential if needed.

### Key rotation
1. Generate a new Ed25519 key pair (Step 2)
2. Update `did/private-keys/yourcompany.jwk.json`
3. Update `publicKeyJwk` in all relevant `did.json` documents
4. Redeploy DID documents
5. Re-issue all credentials

---

## DutchZHC Agent DIDs (Reference)

| Agent | DID |
|---|---|
| DutchZHC (company) | `did:web:dutchzerohumancompany.com` |
| Episkope Duo (CEO) | `did:web:dutchzerohumancompany.com:agents:episkope-duo` |
| Founding Engineer | `did:web:dutchzerohumancompany.com:agents:founding-engineer` |
| Marcom | `did:web:dutchzerohumancompany.com:agents:marcom` |
| Marcom Creative | `did:web:dutchzerohumancompany.com:agents:marcom-creative` |
| CFO | `did:web:dutchzerohumancompany.com:agents:cfo` |

---

## Phase 2 — did:ethr on Polygon (Web3 DIDs)

_Added 2026-05-20. DUTA-380._

### Overview

Each agent and the company now also has a `did:ethr` identity on Polygon mainnet, sitting
alongside the existing `did:web` identity. The two DIDs are linked via `alsoKnownAs` in each
`did:web` DID document. Verifiable Credentials are dual-issued in both formats.

**Technology choices:**
- DID method: `did:ethr` (Ethereum DID Registry on Polygon)
- Signature algorithm: ES256K (secp256k1)
- VC library: [`did-jwt-vc`](https://github.com/decentralized-identity/did-jwt-vc)
- Blockchain: Polygon mainnet (chainId 137)
- Registry: `0xdCa7EF03e98e0DC2B855bE647C39ABe984fcF21B`

### DID format

```
did:ethr:0x89:<ethereum-address>
```

`0x89` is the hex chain ID for Polygon mainnet (137).

### Step A — Install additional dependencies

```bash
npm install ethers ethr-did did-jwt did-jwt-vc did-resolver ethr-did-resolver
```

### Step B — Generate secp256k1 keys

```bash
node did/create-ethr-dids.mjs
```

This generates one Ethereum wallet per entity (company + agents), saves each to
`did/private-keys/<name>.eth.json`, and updates each `did:web` DID document with an
`alsoKnownAs` entry pointing to the new Polygon DID.

Keys are gitignored (covered by the existing `did/private-keys/` rule).

### Step C — Issue dual VCs

```bash
node did/issue-credentials.mjs
```

This now produces four files per agent instead of two:

| File | Algorithm | Issuer DID |
|---|---|---|
| `<agent>-identity.jwt` | EdDSA | `did:web:...` |
| `<agent>-capability.jwt` | EdDSA | `did:web:...` |
| `<agent>-identity-ethr.jwt` | ES256K | `did:ethr:0x89:...` |
| `<agent>-capability-ethr.jwt` | ES256K | `did:ethr:0x89:...` |

### Step D — Verify a did:ethr credential

```bash
node did/verify-credential.mjs did/credentials/episkope-duo-identity-ethr.jwt
```

The verify script auto-detects EdDSA vs ES256K from the JWT header. For ES256K it resolves
the issuer DID via Polygon RPC (defaults to `https://1rpc.io/matic`). Override with:

```bash
POLYGON_RPC=https://your-rpc.example node did/verify-credential.mjs <path>
```

### Step E (optional) — Register DID attributes on-chain

Writing service endpoints to the registry requires MATIC for gas:

```bash
# Fund the wallets first — addresses are in did/private-keys/*.eth.json
POLYGON_RPC=https://your-rpc.example node did/create-ethr-dids.mjs --register
```

This calls `setAttribute('did/svc/LinkedDomains', serviceUrl, 1year)` on the
EthereumDIDRegistry for each entity.

### Key file format

`did/private-keys/<name>.eth.json`:

```json
{
  "did": "did:ethr:0x89:0x<address>",
  "address": "0x<address>",
  "privateKey": "0x<secp256k1-private-key>",
  "publicKey": "0x<compressed-public-key>"
}
```

### DutchZHC Polygon DIDs (Reference)

| Entity | did:ethr DID |
|---|---|
| DutchZHC (company) | `did:ethr:0x89:0x2e34bdb84444de13ab6b78322df3e08d26c9807e` |
| Episkope Duo (CEO) | `did:ethr:0x89:0xfb976c12675ec10cf26a1d24e19fff7a1e0965a8` |
| Founding Engineer | `did:ethr:0x89:0xcfee6e0c914268c7fe43ab62a59d34fcb73b54a0` |
| Marcom | `did:ethr:0x89:0x56e19e5f029ae2565ed82a4c2ba664e7d5280c75` |
| Marcom Creative | `did:ethr:0x89:0x3725b21ef9bd3362462e7db2563b9746d167b385` |
| CFO | `did:ethr:0x89:0xda8031feeba7a391502bc8f91d2fd834448537a1` |
| CISO | `did:ethr:0x89:0x66276021cf9351d7da8dbc37434cee5ec7ae5d97` |
| Legal Counsel | `did:ethr:0x89:0x235bf062986142f5346a29a063b3eeb62368cdd5` |

---

_For operational procedures (re-issuing, revoking, key rotation, webserver config), see `RUNBOOK.md` in the same folder._

---

## Client-Managed Credential Revocation

_Added 2026-06-23. DUTA-887._

Clients who receive credentials from DZHC can host their own Status List 2021 and manage
revocations autonomously using the tooling in `tools/`.

### Deliverables for client engagements

| Tool | Purpose |
|---|---|
| `tools/status-list-init.mjs` | Initialize a fresh status list for a new client |
| `tools/revoke-credential.mjs` | Revoke or restore individual credential entries |

### Step A — Initialize the client status list

Run once when onboarding a new client:

```bash
node tools/status-list-init.mjs --domain client.example.com --output ./client-status-list.json
```

Options:

| Flag | Default | Description |
|---|---|---|
| `--domain` | (required) | Client domain — drives the status list URL |
| `--output` | `./status-list.json` | Output file path |
| `--issuer` | `did:web:<domain>` | Override the issuer DID |
| `--purpose` | `revocation` | `revocation` or `suspension` |

The generated file is a valid W3C Status List 2021 JSON with a 16,384-byte (131,072-bit) all-zero
bitstring, supporting up to 131,072 credential slots.

### Step B — Host the status list

The client must serve the JSON file publicly at:

```
https://<domain>/status-list/status-list-2021.json
```

Serve with `Content-Type: application/json`. Verifiers fetch this URL to check revocation status.

### Step C — Reference the status list in issued credentials

When DZHC issues credentials to the client's agents, include a `credentialStatus` field:

```json
"credentialStatus": {
  "id": "https://client.example.com/status-list/status-list-2021.json#5",
  "type": "StatusList2021Entry",
  "statusPurpose": "revocation",
  "statusListIndex": "5",
  "statusListCredential": "https://client.example.com/status-list/status-list-2021.json"
}
```

Assign each credential a unique, sequential `statusListIndex` starting at 0.

### Step D — Revoke or restore a credential

```bash
# Check current status
node tools/revoke-credential.mjs --status-list ./client-status-list.json --index 5 --action check

# Revoke
node tools/revoke-credential.mjs --status-list ./client-status-list.json --index 5 --action revoke

# Restore
node tools/revoke-credential.mjs --status-list ./client-status-list.json --index 5 --action restore
```

After every change, redeploy the updated `status-list.json` to the hosting URL.

Options:

| Flag | Description |
|---|---|
| `--status-list` | Path to the Status List 2021 JSON file (required) |
| `--index` | 0-based credential index (required) |
| `--action` | `revoke`, `restore`, or `check` (required) |
| `--output` | Write to a different file instead of updating in place |

### How revocation works (W3C Status List 2021)

The `encodedList` field in the JSON is a GZIP-compressed bitstring encoded as base64url.
Each bit position corresponds to one credential's `statusListIndex`. A bit value of `1` means
revoked; `0` means active. Verifiers decompress the list, look up the bit at the credential's
index, and reject the credential if the bit is set.

Bit ordering follows the W3C spec: MSB-first within each byte (index 0 = bit 7 of byte 0,
index 7 = bit 0 of byte 0, index 8 = bit 7 of byte 1, etc.).

No private keys are needed to update the status list — the client controls it entirely.
