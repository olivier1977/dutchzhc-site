#!/usr/bin/env node
/**
 * tools/revoke-credential.mjs
 *
 * Revoke or restore a credential entry in a Status List 2021 JSON file.
 * Reads the encodedList bitstring, flips the bit at the given index, and writes
 * the updated JSON back to the same file (or --output if specified).
 *
 * Usage:
 *   node tools/revoke-credential.mjs --status-list ./status-list.json --index 3 --action revoke
 *   node tools/revoke-credential.mjs --status-list ./status-list.json --index 3 --action restore
 *   node tools/revoke-credential.mjs --status-list ./status-list.json --index 3 --action check
 *
 * Options:
 *   --status-list <file>   Path to the Status List 2021 JSON file (required)
 *   --index <N>            Credential's statusListIndex (required, 0-based integer)
 *   --action <action>      revoke | restore | check (required)
 *   --output <file>        Write to a different file instead of updating in place
 */

import { gzipSync, gunzipSync } from 'zlib';
import { readFileSync, writeFileSync } from 'fs';

const args = process.argv.slice(2);

function getArg(name) {
  const i = args.indexOf(name);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
}

const statusListPath = getArg('--status-list');
const indexStr = getArg('--index');
const action = getArg('--action');
const outputPath = getArg('--output') ?? statusListPath;

if (!statusListPath || indexStr === null || !action) {
  console.error('Usage: node tools/revoke-credential.mjs --status-list <file> --index <N> --action revoke|restore|check [--output <file>]');
  process.exit(1);
}

if (!['revoke', 'restore', 'check'].includes(action)) {
  console.error('--action must be one of: revoke, restore, check');
  process.exit(1);
}

const index = parseInt(indexStr, 10);
if (!Number.isInteger(index) || index < 0) {
  console.error('--index must be a non-negative integer');
  process.exit(1);
}

let statusList;
try {
  statusList = JSON.parse(readFileSync(statusListPath, 'utf8'));
} catch (err) {
  console.error(`Cannot read status list: ${err.message}`);
  process.exit(1);
}

const encodedList = statusList?.credentialSubject?.encodedList;
if (typeof encodedList !== 'string') {
  console.error('Invalid status list: missing credentialSubject.encodedList');
  process.exit(1);
}

let bitstring;
try {
  bitstring = gunzipSync(Buffer.from(encodedList, 'base64url'));
} catch (err) {
  console.error(`Cannot decompress encodedList: ${err.message}`);
  process.exit(1);
}

const maxIndex = bitstring.length * 8 - 1;
if (index > maxIndex) {
  console.error(`Index ${index} exceeds list capacity (max index: ${maxIndex})`);
  process.exit(1);
}

// W3C Status List 2021 spec: MSB-first bit ordering within each byte
const byteIndex = Math.floor(index / 8);
const bitPos = 7 - (index % 8);
const wasRevoked = ((bitstring[byteIndex] >> bitPos) & 1) === 1;

if (action === 'check') {
  console.log(`Index ${index}: ${wasRevoked ? 'revoked' : 'active'}`);
  process.exit(0);
}

if (action === 'revoke') {
  bitstring[byteIndex] |= (1 << bitPos);
} else {
  bitstring[byteIndex] &= ~(1 << bitPos);
}

const isNowRevoked = ((bitstring[byteIndex] >> bitPos) & 1) === 1;

statusList.credentialSubject.encodedList = gzipSync(bitstring).toString('base64url');
writeFileSync(outputPath, JSON.stringify(statusList, null, 2));

const before = wasRevoked ? 'revoked' : 'active';
const after = isNowRevoked ? 'revoked' : 'active';

if (before === after) {
  console.log(`  Index ${index} was already ${before} — no change written.`);
} else {
  console.log(`✓ Index ${index}: ${before} → ${after}`);
  console.log(`  Updated: ${outputPath}`);
  if (action === 'revoke') {
    console.log('');
    console.log('  Remember to redeploy the updated status list to your hosting URL.');
    console.log('  Verifiers will see this credential as revoked on next status check.');
  }
}
