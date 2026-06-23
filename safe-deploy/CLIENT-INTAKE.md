# Safe Multisig Deployment — Client Intake Form

_Complete this form before the kick-off call. Return it to your DZHC account contact._

---

## 1. Client Details

| Field | Value |
|---|---|
| **Company / project name** | _(e.g. Acme Corp)_ |
| **Primary contact name** | |
| **Primary contact email** | |
| **Billing code / reference** | _(optional — used on DZHC invoice)_ |

---

## 2. Network

Which blockchain network should the Safe be deployed on?

- [ ] **Base Sepolia** (testnet — no real funds, recommended for first deployment)
- [ ] **Base mainnet** (production)
- [ ] **Both** (testnet first, then mainnet after review)

> Note: A testnet Safe does not carry over to mainnet. If you choose "Both", DZHC will
> run a test deployment first, share the result for review, then deploy to mainnet.

---

## 3. Signer Wallets

List every wallet address that should be an owner of the Safe. Each signer will be able
to approve transactions. At minimum, provide the addresses of all human signers.

| # | Label / Role | Ethereum address (0x…) | Type |
|---|---|---|---|
| 1 | _(e.g. CEO — hardware wallet)_ | `0x` | Human |
| 2 | _(e.g. CFO — hardware wallet)_ | `0x` | Human |
| 3 | _(e.g. Ops agent EOA)_ | `0x` | Agent EOA |
| 4 | | `0x` | |
| 5 | | `0x` | |

> **Tips:**
> - Hardware wallets (Ledger, Trezor) are strongly recommended for human signers.
> - Agent EOA = a wallet managed by an automated agent; label it clearly.
> - Double-check each address — a wrong address locks funds permanently.
> - You can add more rows if needed.

---

## 4. Signing Threshold

How many signers must approve before a transaction can execute?

**Threshold:** _____ of _____ (fill in both numbers)

Examples:
- 2 of 3 — a common default; one signer can be offline
- 3 of 5 — stronger security; requires majority
- 1 of 2 — convenience-optimised; one signer has full control

> DZHC recommends at least **2 of N** for any Safe holding real funds.

---

## 5. Transaction Approvals (optional)

Are there any governance rules DZHC should be aware of when setting up the Safe?
For example: agent EOAs may only co-sign, never initiate; certain signers have veto rights.

_Free text:_

---

## 6. Safe Naming (optional)

Do you want DZHC to tag this Safe in our records with a short name?

**Internal label:** _(e.g. "Acme Treasury", "Acme Ops Wallet")_

---

## 7. Post-Deployment Handoff

After deployment, DZHC will share:
- Safe address on-chain
- Block explorer link
- Safe{Wallet} app link (app.safe.global) — import the address there to start signing

Who should receive the handoff email?

| Name | Email |
|---|---|
| | |

---

## 8. Checklist (to be completed by DZHC before deployment)

- [ ] All signer addresses confirmed with client (checksummed)
- [ ] Threshold agreed and recorded
- [ ] Network confirmed
- [ ] Deployer wallet funded (Base ETH for gas)
- [ ] `DEPLOYER_PRIVATE_KEY` loaded into secure environment
- [ ] Test run on Base Sepolia completed (if mainnet deployment)
- [ ] Client received testnet Safe address for review
- [ ] Client confirmed — proceed to mainnet

---

_DZHC Safe Deployment Service · [DUTA-892](/DUTA/issues/DUTA-892)_
