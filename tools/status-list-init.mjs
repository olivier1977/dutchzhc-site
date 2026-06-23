#!/usr/bin/env node
/**
 * tools/status-list-init.mjs
 *
 * Initialize a fresh Status List 2021 JSON for a new client engagement.
 * Generates a 16,384-byte (131,072-bit) all-zero bitstring — one bit per credential slot.
 *
 * Usage:
 *   node tools/status-list-init.mjs --domain example.com
 *   node tools/status-list-init.mjs --domain example.com --output ./client-status-list.json
 *   node tools/status-list-init.mjs --domain example.com --issuer did:web:example.com --purpose suspension
 */

import { gzipSync } from 'zlib';
import { writeFileSync } from 'fs';

const args = process.argv.slice(2);

function getArg(name) {
  const i = args.indexOf(name);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
}

const domain = getArg('--domain');
const outputPath = getArg('--output') ?? './status-list.json';
const purpose = getArg('--purpose') ?? 'revocation';
const issuerOverride = getArg('--issuer');

if (!domain) {
  console.error('Error: --domain is required\n');
  console.error('Usage: node tools/status-list-init.mjs --domain <domain> [options]');
  console.error('');
  console.error('Options:');
  console.error('  --domain <domain>       Client domain (required), e.g. example.com');
  console.error('  --output <file>         Output path (default: ./status-list.json)');
  console.error('  --issuer <did>          Override issuer DID (default: did:web:<domain>)');
  console.error('  --purpose <purpose>     revocation or suspension (default: revocation)');
  process.exit(1);
}

if (!['revocation', 'suspension'].includes(purpose)) {
  console.error('--purpose must be "revocation" or "suspension"');
  process.exit(1);
}

const issuerDid = issuerOverride ?? `did:web:${domain}`;
const statusListUrl = `https://${domain}/status-list/status-list-2021.json`;

// W3C Status List 2021 minimum: 16 KB bitstring = 131,072 credential slots
const BITSTRING_BYTES = 16384;
const bitstring = Buffer.alloc(BITSTRING_BYTES, 0);
const encodedList = gzipSync(bitstring).toString('base64url');

const statusListCredential = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://w3id.org/vc/status-list/2021/v1',
  ],
  id: statusListUrl,
  type: ['VerifiableCredential', 'StatusList2021Credential'],
  issuer: issuerDid,
  issuanceDate: new Date().toISOString(),
  credentialSubject: {
    id: `${statusListUrl}#list`,
    type: 'StatusList2021',
    statusPurpose: purpose,
    encodedList,
  },
};

writeFileSync(outputPath, JSON.stringify(statusListCredential, null, 2));

console.log(`✓ Status list initialized → ${outputPath}`);
console.log(`  Domain:   ${domain}`);
console.log(`  Issuer:   ${issuerDid}`);
console.log(`  Purpose:  ${purpose}`);
console.log(`  Capacity: 131,072 credentials (indices 0–131071)`);
console.log(`  URL:      ${statusListUrl}`);
console.log('');
console.log('Next steps:');
console.log(`  1. Host the file at: ${statusListUrl}`);
console.log(`     Serve with Content-Type: application/json`);
console.log('');
console.log('  2. Reference in issued credentials:');
console.log('     credentialStatus: {');
console.log(`       id: "${statusListUrl}#<index>",`);
console.log('       type: "StatusList2021Entry",');
console.log(`       statusPurpose: "${purpose}",`);
console.log('       statusListIndex: "<index>",');
console.log(`       statusListCredential: "${statusListUrl}"`);
console.log('     }');
console.log('');
console.log('  3. Revoke a credential:');
console.log(`     node tools/revoke-credential.mjs --status-list ${outputPath} --index <N> --action revoke`);
