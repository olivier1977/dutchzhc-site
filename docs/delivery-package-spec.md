# Delivery Package Specification

> Describes every file a client receives from DZHC after running the VC issuance workflow,
> and how each file maps to a public URL on the client's domain.

---

## Overview

When DZHC issues verifiable credentials for a client, the output is a **delivery package** ZIP.
The ZIP contains:

| Category | Files | Deployed? |
|----------|-------|-----------|
| Company identity | `.well-known/did.json` | Yes |
| Agent identities | `agents/<name>/did.json` (one per agent) | Yes |
| JSON-LD schemas | `schemas/<TypeName>.jsonld` (two types) | Yes |
| Revocation | `status-list/status-list-2021.json` | Yes |
| Credentials | `credentials/<name>-identity.jwt`, `credentials/<name>-capability.jwt` | No — hand to agent |
| Private keys | `private-keys/*.jwk.json` | **Never** — secrets-manager only |
| Metadata | `manifest.json`, `README.md` | Optional |

---

## File-by-file reference

### `.well-known/did.json`

| Field | Value |
|-------|-------|
| Deploy URL | `https://<domain>/.well-known/did.json` |
| Content-Type | `application/json` |
| Purpose | Root DID document for the company (`did:web:<domain>`). Contains the issuer Ed25519 public key used to verify all VC-JWTs. |
| Update frequency | Regenerate if the company key is rotated. |

---

### `agents/<name>/did.json`

| Field | Value |
|-------|-------|
| Deploy URL | `https://<domain>/agents/<name>/did.json` |
| Content-Type | `application/json` |
| Purpose | Per-agent DID document (`did:web:<domain>:agents:<name>`). References the agent's own Ed25519 public key. |
| Update frequency | Regenerate if an agent's key is rotated or the agent is removed. |

---

### `schemas/<TypeName>.jsonld`

Two schema files are generated per client, named after the domain:

| Schema | Deploy URL |
|--------|-----------|
| `<Slug>AgentIdentity.jsonld` | `https://<domain>/schemas/<Slug>AgentIdentity.jsonld` |
| `<Slug>AgentCapability.jsonld` | `https://<domain>/schemas/<Slug>AgentCapability.jsonld` |

Where `<Slug>` is the first label of the domain (e.g. `Acme` for `acme.com`).

| Field | Value |
|-------|-------|
| Content-Type | `application/json` |
| Purpose | JSON-LD context files that define the credential vocabulary. Referenced in every VC. |
| Update frequency | Stable; only update if new credential fields are added. |

---

### `status-list/status-list-2021.json`

| Field | Value |
|-------|-------|
| Deploy URL | `https://<domain>/status-list/status-list-2021.json` |
| Content-Type | `application/json` |
| Purpose | W3C Status List 2021 scaffold. Verifiers fetch this to check whether a credential has been revoked. |
| Update frequency | Update when revoking a credential (set the relevant bit). |

The status list uses a bit-packed, gzip-compressed, base64url-encoded bitstring. Each agent
gets two consecutive indices: one for its identity VC and one for its capability VC.

---

### `credentials/<name>-identity.jwt`

| Field | Value |
|-------|-------|
| Deploy URL | None — deliver to agent directly |
| Format | Compact JWT (`EdDSA` / `JsonWebKey2020`) |
| Purpose | Identity credential asserting the agent's name, role, title, and DID. |
| Signed by | Company Ed25519 key (`did:web:<domain>#key-1`) |

---

### `credentials/<name>-capability.jwt`

| Field | Value |
|-------|-------|
| Deploy URL | None — deliver to agent directly |
| Format | Compact JWT (`EdDSA` / `JsonWebKey2020`) |
| Purpose | Capability credential listing what the agent is authorised to do (`capabilities[]`, `canCreateAgents`, `canSignTransactions`, `reportsTo`). |
| Signed by | Company Ed25519 key (`did:web:<domain>#key-1`) |

---

### `private-keys/*.jwk.json`

| Field | Value |
|-------|-------|
| Deploy URL | **Never deploy** |
| Purpose | Ed25519 key pairs (company + per-agent) used to sign credentials. |
| Storage | Secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.) |

The ZIP delivered to the client does **not** contain `private-keys/`. DZHC retains them in a
secrets manager under a key path tied to the client's `domain`.

---

## Workflow summary

```
intake-form.json
      |
      v
issue-client-credentials.mjs
      |
      +-- [1] Writes _roster.json
      +-- [2] Runs did-setup-client.mjs  --> full working tree in client-output/<domain>/
      +-- [3] Verifies every .jwt with did/verify-credential.mjs
      +-- [4] Writes README.md into working tree
      +-- [5] Packages delivery ZIP (private-keys/ excluded)
      |
      v
<domain>-delivery.zip  (send to client)
client-output/<domain>/private-keys/  (store in secrets manager)
```

---

## Verification

Before packaging, `issue-client-credentials.mjs` runs `did/verify-credential.mjs` against
every `.jwt` file in `credentials/`. A single verification failure aborts the ZIP step.

To verify manually after delivery:

```bash
node did/verify-credential.mjs /path/to/<agent>-identity.jwt
```

---

## References

- Issuance CLI: `tools/did-setup-client.mjs`
- Intake form template: `tools/intake-form.template.json`
- Verify tool: `did/verify-credential.mjs`
- Client onboarding guide: `docs/client-onboarding-guide.md`
