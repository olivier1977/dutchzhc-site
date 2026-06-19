/**
 * CFO Key Rotation Ceremony Script — DUTA-818
 *
 * Proposes a swapOwner transaction on the Base Safe to replace the compromised
 * CFO signer (0xa89BcB445d4FEA3473Aec4B75B12B99b8f696f60) with the new key
 * (0xda8031feeba7a391502bc8f91d2fd834448537a1).
 *
 * CEREMONY REQUIREMENTS:
 *   - Run with BOARD_MEMBER_1_PRIVATE_KEY or BOARD_MEMBER_2_PRIVATE_KEY set.
 *   - At least 2-of-3 signers must approve (CFO key is compromised; use BM1 + BM2).
 *   - At least one human witness must be present during signing.
 *
 * Usage:
 *   BOARD_MEMBER_1_PRIVATE_KEY=0x... node safe-deploy/rotate-cfo-key.mjs
 */

import { default as Safe } from '@safe-global/protocol-kit';

const SAFE_ADDRESS = '0xF6d959FdC7f51CFa76b67aC4c7e31325F8763B33';
const OLD_CFO_ADDRESS = '0xa89BcB445d4FEA3473Aec4B75B12B99b8f696f60';
const NEW_CFO_ADDRESS = '0xda8031feeba7a391502bc8f91d2fd834448537a1';
const BASE_RPC = 'https://mainnet.base.org';

// One of the board member keys must be provided to propose the tx
const SIGNER_KEY = process.env.BOARD_MEMBER_1_PRIVATE_KEY || process.env.BOARD_MEMBER_2_PRIVATE_KEY;
if (!SIGNER_KEY) {
  throw new Error('BOARD_MEMBER_1_PRIVATE_KEY or BOARD_MEMBER_2_PRIVATE_KEY env var required');
}

async function proposeSwapOwner() {
  console.log('=== CFO Key Rotation Ceremony — DUTA-818 ===');
  console.log('Safe:', SAFE_ADDRESS);
  console.log('Removing old CFO key:', OLD_CFO_ADDRESS);
  console.log('Adding new CFO key: ', NEW_CFO_ADDRESS);
  console.log('');

  const protocolKit = await Safe.init({
    provider: BASE_RPC,
    signer: SIGNER_KEY,
    safeAddress: SAFE_ADDRESS,
  });

  const owners = await protocolKit.getOwners();
  const threshold = await protocolKit.getThreshold();
  console.log('Current owners:', owners);
  console.log('Threshold:', threshold);
  console.log('');

  if (!owners.map(o => o.toLowerCase()).includes(OLD_CFO_ADDRESS.toLowerCase())) {
    throw new Error(`Old CFO address ${OLD_CFO_ADDRESS} is not a current owner — rotation may already be complete`);
  }

  // Build swapOwner transaction
  const swapOwnerTx = await protocolKit.createSwapOwnerTx({
    oldOwnerAddress: OLD_CFO_ADDRESS,
    newOwnerAddress: NEW_CFO_ADDRESS,
  });

  console.log('SwapOwner transaction data:');
  console.log('  to:    ', swapOwnerTx.data.to);
  console.log('  value: ', swapOwnerTx.data.value);
  console.log('  data:  ', swapOwnerTx.data.data);
  console.log('');

  // Sign the transaction with this board member
  const signedTx = await protocolKit.signTransaction(swapOwnerTx);
  console.log('Signed by current signer.');
  console.log('');
  console.log('NEXT: Have the second board member sign and execute via Safe UI at:');
  console.log('  https://app.safe.global/base:' + SAFE_ADDRESS);
  console.log('');
  console.log('Or run this script with the second board member key and call executeTransaction.');

  return signedTx;
}

proposeSwapOwner().catch(console.error);
