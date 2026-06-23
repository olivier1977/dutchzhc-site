# Safe Multisig Deployment — Service Runbook

_DZHC Internal · Last updated: 2026-06-23_

---

## Overview

This guide covers the end-to-end process for deploying a Safe multisig wallet for a client
using `safe-deploy/deploy.mjs`. The script is fully parameterised — no code changes are
needed between client deployments.

**What you will deploy:** A Gnosis Safe multisig smart contract on Base (mainnet or Sepolia)
with the client's desired signer set and threshold.

**Prerequisites (engineer side):**
- Node.js 18+ installed
- `safe-deploy/` dependencies installed (`npm install` inside `safe-deploy/`)
- A funded deployer wallet (Base ETH for gas — ~0.001 ETH covers deployment)
- `DEPLOYER_PRIVATE_KEY` env var set to that wallet's private key

---

## Step 1 — Receive the Client Intake Form

Ask the client to complete `safe-deploy/CLIENT-INTAKE.md` and return it before the call.

Confirm the following before proceeding:
- All signer addresses are checksummed Ethereum addresses starting with `0x`
- Threshold makes sense (`threshold ≤ number_of_signers`, minimum 2 for real funds)
- Network is agreed (testnet first is strongly recommended)

---

## Step 2 — Fund the Deployer Wallet

The deployer wallet pays gas for the Safe factory call. It does **not** become a Safe signer.

| Network | Gas cost (approx) | Where to get ETH |
|---|---|---|
| Base Sepolia | 0 (free faucet) | faucet.quicknode.com/base/sepolia |
| Base mainnet | ~0.001 ETH | Bridge via bridge.base.org |

Check the deployer balance before running:
```bash
# Quick balance check via cast (foundry) — or use a block explorer
cast balance <DEPLOYER_ADDRESS> --rpc-url https://mainnet.base.org
cast balance <DEPLOYER_ADDRESS> --rpc-url https://sepolia.base.org
```

---

## Step 3 — Set Environment Variables

```bash
# Required
export DEPLOYER_PRIVATE_KEY=0x<deployer-private-key>

# Optional overrides (can also pass as CLI flags — see Step 4)
export SAFE_SIGNERS=0xAaa...,0xBbb...,0xCcc...
export SAFE_THRESHOLD=2
export SAFE_NETWORK=base-sepolia   # or: base
```

> Store `DEPLOYER_PRIVATE_KEY` in a secrets manager or `.env` file that is **never committed**.
> The `.gitignore` already excludes `.env` files.

---

## Step 4 — Deploy on Base Sepolia (testnet)

Run the deployment script with the client's signer addresses and threshold:

```bash
cd safe-deploy
node deploy.mjs \
  --network base-sepolia \
  --signers 0xAaa...,0xBbb...,0xCcc... \
  --threshold 2
```

Expected output:
```
Deploying Safe on base-sepolia...
  Owners (3): 0xAaa..., 0xBbb..., 0xCcc...
  Threshold: 2-of-3
  RPC: https://sepolia.base.org

Predicted Safe address: 0x<safe-address>
Deployment transaction submitted: 0x<tx-hash>
Safe address: 0x<safe-address>

Verify on-chain: https://sepolia.basescan.org/address/0x<safe-address>
```

Verify on Sepolia Basescan that:
1. The contract was deployed (status: success)
2. The owner list and threshold match the intake form

Share the Sepolia Safe address with the client via the Safe{Wallet} app:
`https://app.safe.global/sep:0x<safe-address>`

---

## Step 5 — Client Review (testnet)

Ask the client to:
1. Import the testnet Safe address in the Safe{Wallet} app
2. Confirm the signer list and threshold look correct
3. Optionally run a test transaction (e.g. send 0 ETH to themselves)

Do **not** proceed to mainnet until the client has confirmed the testnet Safe.

---

## Step 6 — Deploy on Base Mainnet

Once the client confirms testnet is correct, deploy to mainnet with the same parameters:

```bash
cd safe-deploy
node deploy.mjs \
  --network base \
  --signers 0xAaa...,0xBbb...,0xCcc... \
  --threshold 2
```

> The mainnet Safe address will differ from the testnet address (different chain ID).
> This is expected.

Verify on Basescan:
`https://basescan.org/address/0x<safe-address>`

---

## Step 7 — Handoff to Client

Send the client a handoff message containing:

```
Safe address: 0x<safe-address>
Network: Base mainnet
Owners: <list each signer address with the label from the intake form>
Threshold: <M>-of-<N>

Block explorer: https://basescan.org/address/0x<safe-address>
Safe{Wallet} app: https://app.safe.global/base:0x<safe-address>

To start using your Safe:
1. Open https://app.safe.global
2. Click "Add existing Safe" → enter the address above
3. Each signer connects their wallet and can now sign transactions
```

---

## Step 8 — Record the Deployment

Add an entry to the internal record (create a comment on the relevant DUTA issue) with:
- Client name
- Safe address
- Network
- Signer count + threshold
- Deployer wallet used (address only, not key)
- Date

---

## Troubleshooting

### "Deployer private key is required"
Set `DEPLOYER_PRIVATE_KEY` in your shell before running, or use the legacy `CFO_PRIVATE_KEY`.

### "Unknown network"
Valid values are `base` (mainnet) and `base-sepolia`. Check for typos.

### "Threshold must be between 1 and N"
Threshold cannot exceed the number of signers. Re-check the intake form values.

### Transaction fails / insufficient funds
Fund the deployer wallet with Base ETH. Check the balance on Basescan.

### Safe address already deployed
The Safe factory is deterministic — same owners + threshold + salt = same address.
If the predicted address already has code, a previous deployment used the same config.
That Safe is already live; no re-deployment is needed.

---

## Reference — Script Parameters

| Parameter | CLI flag | Env var | Default | Required |
|---|---|---|---|---|
| Network | `--network` | `SAFE_NETWORK` | `base` | No |
| Signer addresses | `--signers` | `SAFE_SIGNERS` | — | **Yes** |
| Threshold | `--threshold` | `SAFE_THRESHOLD` | — | **Yes** |
| Deployer key | — | `DEPLOYER_PRIVATE_KEY` | (falls back to `CFO_PRIVATE_KEY`) | **Yes** |

CLI flags take precedence over env vars.

---

_For the client-facing intake template, see `safe-deploy/CLIENT-INTAKE.md`._
_For the client-facing DID onboarding guide, see `docs/client-onboarding-guide.md`._
