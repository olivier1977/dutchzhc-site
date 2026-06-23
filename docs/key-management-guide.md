# Client Key Management Guide

_How to securely generate, store, protect, and rotate your Ed25519 signing keys_

**Audience:** Operators of AI agent teams who are not cryptographers.
**Last updated:** 2026-06-23

---

## What is a signing key and why does it matter?

Your Ed25519 signing key is the root of trust for your agent team's identity. Every Verifiable Credential (VC) that proves who your agents are — and what they are allowed to do — is signed by this key. Anyone who obtains your **private key** can issue fraudulent credentials on your behalf and impersonate your agents.

The key comes in two parts:

| Part | What it is | Who sees it |
|---|---|---|
| **Public key** (`x` field in JWK) | Safe to share. Goes into your DID document. | Anyone |
| **Private key** (`d` field in JWK) | Must stay secret. Signs credentials. | You alone |

---

## 1. Generating an Ed25519 key pair

Run this one-liner anywhere you have Node.js 18+:

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

**What you get back** — a JSON object with two keys:

```json
{
  "publicKeyJwk": {
    "kty": "OKP",
    "crv": "Ed25519",
    "x": "AbCdEfGh..."
  },
  "privateKeyJwk": {
    "kty": "OKP",
    "crv": "Ed25519",
    "x": "AbCdEfGh...",
    "d": "SecretSecretSecret..."
  }
}
```

Field meanings:

| Field | Meaning |
|---|---|
| `kty: "OKP"` | Key type: Octet Key Pair (the family Ed25519 belongs to) |
| `crv: "Ed25519"` | The specific curve / algorithm |
| `x` | The public key material (32 bytes, base64url-encoded) |
| `d` | The private key material (32 bytes, base64url-encoded) — **keep this secret** |

Save the full JSON object as `did/private-keys/yourcompany.jwk.json` and add a `did` field:

```json
{
  "did": "did:web:yourcompany.com",
  "publicKeyJwk":  { "kty": "OKP", "crv": "Ed25519", "x": "..." },
  "privateKeyJwk": { "kty": "OKP", "crv": "Ed25519", "x": "...", "d": "..." }
}
```

Only the `publicKeyJwk.x` value goes into your public DID document. The `privateKeyJwk` block never leaves secure storage.

---

## 2. Storage options

### Option A — Hardware security key (recommended for production)

A hardware key (YubiKey 5 series or equivalent FIDO2 device with OpenPGP/PIV support) stores the private key inside tamper-resistant hardware. The key never leaves the device — signing happens on the chip.

| | |
|---|---|
| **Pros** | Private key physically cannot be extracted; protects against malware and insider theft |
| **Cons** | Requires physical presence to sign; more complex setup; costs ~€60–120 per device |
| **Best for** | Company root keys, high-value issuer keys |

**Setup sketch:** Use a YubiKey with PIV (Personal Identity Verification) slot 9c (Digital Signature). Generate the key on-device using `ykman piv keys generate`. Never export. Use `ykman piv certificates` to reference the key in your issuance scripts.

### Option B — Secrets manager (recommended for automated pipelines)

Cloud secrets managers store encrypted secrets server-side and expose them to authorized services via API. Your CI/CD pipeline or agent runtime retrieves the key at runtime without it touching disk.

| Service | Free tier | Notes |
|---|---|---|
| **AWS Secrets Manager** | No (≈$0.40/secret/month) | Fine-grained IAM policies; automatic rotation hooks |
| **HashiCorp Vault** | Yes (self-hosted) | Most flexible; supports dynamic secrets; run on your own infra |
| **GCP Secret Manager** | Yes (10k accesses/month free) | Simple API; IAM-integrated; good for GCP-native stacks |

| | |
|---|---|
| **Pros** | Secrets never touch your local filesystem; auditable access logs; rotation automation |
| **Cons** | Requires cloud account setup; adds a dependency; API call latency |
| **Best for** | Automated agent pipelines, CI/CD, multi-developer teams |

**Example — reading from AWS Secrets Manager at runtime:**

```bash
aws secretsmanager get-secret-value \
  --secret-id yourcompany/did/private-key \
  --query SecretString \
  --output text > /tmp/key.json
# Use /tmp/key.json in your script, then immediately delete it
```

### Option C — Environment variable (acceptable for low-risk or local use)

Store the JSON-stringified private key as an environment variable. Load it in your issuance script with `process.env.COMPANY_PRIVATE_KEY`.

| | |
|---|---|
| **Pros** | Zero infrastructure; works immediately; easy for solo developers |
| **Cons** | Env vars can leak through process listings, crash dumps, and misconfigured logging |
| **Best for** | Local development, low-risk or experimental setups only |

**Setup:**

```bash
# In your shell profile or .env file (never commit .env to git)
export COMPANY_PRIVATE_KEY='{"kty":"OKP","crv":"Ed25519","x":"...","d":"..."}'
```

---

## 3. What NOT to do

These practices compromise your private key and must be avoided:

| Do NOT | Why it is dangerous |
|---|---|
| Commit the key file to git | Git history is permanent; anyone with repo access — now or later — has the key |
| Share via email or Slack | Stored forever in mail servers, Slack logs, and anyone's inbox |
| Store in plaintext on a shared drive | No access control; any team member (or attacker with access) can read it |
| Paste into a cloud AI chat / form | You lose all control over where the text is stored or logged |
| Store in the same repo as your code | Even private repos are at risk from compromised tokens or overly broad access |

Add the private-keys directory to your `.gitignore` immediately:

```bash
echo "did/private-keys/" >> .gitignore
git rm -r --cached did/private-keys/ 2>/dev/null || true
```

---

## 4. Key backup and recovery

A lost private key means you cannot re-issue credentials — you would need to start over with a new key and re-issue everything. Back up before you need it.

### Backup checklist

- [ ] Export the key as an encrypted file (see below) immediately after generation
- [ ] Store the encrypted backup in a separate location from where the key is used (different cloud provider, offline drive, or physical safe)
- [ ] Record the decryption passphrase in a password manager — not in the same location as the backup
- [ ] Test restoration at least once before going to production

### Encrypting a backup with a passphrase

```bash
# Encrypt
openssl enc -aes-256-cbc -pbkdf2 -in did/private-keys/yourcompany.jwk.json \
  -out yourcompany.jwk.json.enc
# Enter a strong passphrase when prompted

# Decrypt (to restore)
openssl enc -d -aes-256-cbc -pbkdf2 -in yourcompany.jwk.json.enc \
  -out did/private-keys/yourcompany.jwk.json
```

Store `yourcompany.jwk.json.enc` in a secure offline location (encrypted USB drive, safe deposit box, or a separate cloud account you do not use for day-to-day work).

---

## 5. Key rotation

### When to rotate

| Trigger | Action |
|---|---|
| **Annual (routine)** | Rotate once per year as preventive hygiene |
| **Key compromise** | Rotate immediately — see Section 6 (Incident Response) |
| **Team change** | Rotate when a person with key access leaves the team |
| **Suspected breach** | Rotate immediately if you suspect unauthorized access to your infrastructure |

### Rotation procedure (step-by-step)

**Step 1 — Generate a new key pair**

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

**Step 2 — Save the new key**

Replace `did/private-keys/yourcompany.jwk.json` with the new output. Keep the old file somewhere safe until rotation is confirmed complete.

**Step 3 — Update your DID document**

In `did/.well-known/did.json`, replace `publicKeyJwk.x` with the new public key's `x` value:

```json
{
  "verificationMethod": [{
    "publicKeyJwk": {
      "kty": "OKP",
      "crv": "Ed25519",
      "x": "<NEW-PUBLIC-KEY-X-HERE>"
    }
  }]
}
```

Do the same for any agent DID documents if they use the company key.

**Step 4 — Re-deploy the DID document**

Upload the updated `did.json` to your web server so the new public key is publicly resolvable:

```
https://yourcompany.com/.well-known/did.json
```

**Step 5 — Re-issue all credentials**

```bash
node did/issue-credentials.mjs
```

This re-signs all credentials with the new key. New credentials expire 1 year from issuance.

**Step 6 — Re-deploy credentials**

Upload the updated `.jwt` files to your web server if you host them publicly.

**Step 7 — Verify**

```bash
node did/verify-credential.mjs did/credentials/ceo-identity.jwt
```

Confirm the output shows the correct `issuer`, `issuedAt`, and `expirationTime`.

**Step 8 — Securely delete the old key**

Once all credentials are re-issued and verified, delete the old private key file. Do not keep it alongside the new one.

---

## 6. Incident response: compromised private key

A compromised key is a security emergency. Move quickly — the attacker can issue credentials on your behalf for as long as your old key is valid.

### Immediate actions (within the hour)

**Step 1 — Revoke all credentials signed by the compromised key**

Update the revocation status list to mark all affected credentials as revoked:

1. Open `did/status-list/status-list-2021.json`
2. Set the bit at each credential's `statusListIndex` to `1` (revoked) in the `encodedList`
3. Re-sign and immediately deploy the updated status list to your web server

This tells verifiers that existing credentials are no longer valid.

**Step 2 — Rotate the key (full procedure from Section 5)**

Generate a new key, update the DID document, and deploy it. This invalidates any future use of the old key for new signatures.

**Step 3 — Re-issue all credentials**

```bash
node did/issue-credentials.mjs
```

Re-deploy the new `.jwt` files.

**Step 4 — Notify affected parties**

Inform any partners, verifiers, or services that accepted credentials signed by the old key. They should re-fetch and re-verify agent credentials.

### Assess the blast radius

Answer these questions to scope the incident:

- Where was the key stored? (env var, file, secrets manager, hardware key)
- Who had access to that storage location?
- Are there access logs? When was the key last accessed by a non-authorized process?
- Was any unauthorized credential issuance observed?

### After the incident

- Document what happened and how the key was exposed
- Review your storage option (Section 2) and upgrade if needed
- Add monitoring/alerts on your secrets manager or file access logs

---

## Quick reference

| Task | Command |
|---|---|
| Generate a new key pair | `node -e "const {generateKeyPairSync}=require('crypto');..."` (see Section 1) |
| Re-issue all credentials | `node did/issue-credentials.mjs` |
| Verify a credential | `node did/verify-credential.mjs did/credentials/<agent>-identity.jwt` |
| Encrypt key backup | `openssl enc -aes-256-cbc -pbkdf2 -in key.json -out key.json.enc` |
| Decrypt key backup | `openssl enc -d -aes-256-cbc -pbkdf2 -in key.json.enc -out key.json` |

### Rotation schedule reminder

| Event | Rotate? |
|---|---|
| Annual (1 Jan or anniversary of last rotation) | Yes |
| Team member with key access leaves | Yes, immediately |
| Credentials near 1-year expiry | Re-issue credentials; rotate key if overdue |
| Suspected or confirmed compromise | Yes, immediately — follow Section 6 |

---

_For operational scripts and DID infrastructure details, see `did/RUNBOOK.md` and `did/SETUP-GUIDE.md`._
