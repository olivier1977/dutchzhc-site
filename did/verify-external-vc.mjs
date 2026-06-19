/**
 * External VC Verifier — verifies Verifiable Credentials issued by a third-party DID against
 * that party's published DID document.
 *
 * Designed for TRA Phase 2: verifying VCs submitted by The Agents (did:web:the-agents.io)
 * against their Ed25519 public key at https://the-agents.io/.well-known/did.json
 *
 * Usage:
 *   node did/verify-external-vc.mjs <path-to-jwt-file> [did-document-url]
 *
 * Examples:
 *   node did/verify-external-vc.mjs the-agents-governance.jwt
 *   node did/verify-external-vc.mjs the-agents-governance.jwt https://the-agents.io/.well-known/did.json
 */

import { jwtVerify, importJWK, decodeProtectedHeader } from 'jose';
import { readFileSync } from 'fs';

const [,, credentialPath, didDocUrl] = process.argv;

if (!credentialPath) {
  console.error('Usage: node did/verify-external-vc.mjs <path-to-jwt-file> [did-document-url]');
  process.exit(1);
}

const jwt = readFileSync(credentialPath, 'utf8').trim();

const header = decodeProtectedHeader(jwt);
const alg = header.alg;

if (alg !== 'EdDSA') {
  console.error(`✗ Unsupported algorithm: ${alg}. This tool verifies EdDSA credentials only.`);
  process.exit(1);
}

const didUrl = didDocUrl || 'https://the-agents.io/.well-known/did.json';

console.log(`Fetching DID document from: ${didUrl}`);
const res = await fetch(didUrl);
if (!res.ok) {
  console.error(`✗ Could not fetch DID document: HTTP ${res.status}`);
  process.exit(1);
}

const didDoc = await res.json();

// Find the Ed25519 assertion method key
const assertionMethodRefs = didDoc.assertionMethod || [];
const verificationMethods = didDoc.verificationMethod || [];

let signingKey = null;
for (const ref of assertionMethodRefs) {
  const keyId = typeof ref === 'string' ? ref : ref.id;
  const vm = verificationMethods.find(m => m.id === keyId);
  if (vm && vm.publicKeyJwk && vm.publicKeyJwk.crv === 'Ed25519') {
    signingKey = vm;
    break;
  }
}

if (!signingKey) {
  console.error('✗ No Ed25519 assertionMethod key found in DID document');
  process.exit(1);
}

console.log(`Using key: ${signingKey.id}`);
console.log(`Key (x): ${signingKey.publicKeyJwk.x}\n`);

const publicKey = await importJWK({ ...signingKey.publicKeyJwk, crv: 'Ed25519' }, 'EdDSA');

try {
  const { payload, protectedHeader } = await jwtVerify(jwt, publicKey);
  console.log('✓ Signature valid (EdDSA / did:web)\n');
  console.log('Header:', JSON.stringify(protectedHeader, null, 2));
  console.log('\nClaims:');
  console.log('  Issuer:  ', payload.iss);
  console.log('  Subject: ', payload.sub);
  if (payload.iat) console.log('  Issued:  ', new Date(payload.iat * 1000).toISOString());
  if (payload.exp) console.log('  Expires: ', new Date(payload.exp * 1000).toISOString());
  if (payload.vc) {
    console.log('\nVC Type:', JSON.stringify(payload.vc.type));
    console.log('\nCredential Subject:');
    console.log(JSON.stringify(payload.vc.credentialSubject, null, 2));
  }
} catch (err) {
  console.error('✗ Verification failed:', err.message);
  process.exit(1);
}
