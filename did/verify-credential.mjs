/**
 * DutchZHC Verifiable Credential Verification Script
 *
 * Verifies a VC-JWT against the appropriate key, auto-detecting the type:
 *   - EdDSA / did:web  → verified locally against the company Ed25519 public key
 *   - ES256K / did:ethr → verified via ethr-did-resolver against the Polygon DID
 *
 * Usage:
 *   node did/verify-credential.mjs did/credentials/episkope-duo-identity.jwt
 *   node did/verify-credential.mjs did/credentials/episkope-duo-identity-ethr.jwt
 *
 * For did:ethr verification, set POLYGON_RPC env var (defaults to https://polygon-rpc.com):
 *   POLYGON_RPC=https://polygon-rpc.com node did/verify-credential.mjs <path>
 */

import { jwtVerify, importJWK, decodeProtectedHeader } from 'jose';
import { verifyCredential } from 'did-jwt-vc';
import { Resolver } from 'did-resolver';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const [,, credentialPath] = process.argv;
if (!credentialPath) {
  console.error('Usage: node did/verify-credential.mjs <path-to-jwt-file>');
  process.exit(1);
}

const jwt = readFileSync(credentialPath, 'utf8').trim();

// Peek at the header to determine algorithm
const header = decodeProtectedHeader(jwt);
const alg = header.alg;

if (alg === 'EdDSA') {
  // --- did:web / EdDSA path ---
  const companyDid = JSON.parse(readFileSync(join(__dirname, '.well-known/did.json'), 'utf8'));
  const vm = companyDid.verificationMethod[0];
  const publicKey = await importJWK({ ...vm.publicKeyJwk, crv: 'Ed25519' }, 'EdDSA');

  try {
    const { payload, protectedHeader } = await jwtVerify(jwt, publicKey);
    console.log('✓ Signature valid (EdDSA / did:web)\n');
    console.log('Header:', JSON.stringify(protectedHeader, null, 2));
    console.log('\nClaims:');
    console.log('  Issuer:  ', payload.iss);
    console.log('  Subject: ', payload.sub);
    console.log('  Issued:  ', new Date(payload.iat * 1000).toISOString());
    console.log('  Expires: ', new Date(payload.exp * 1000).toISOString());
    console.log('\nVC:');
    console.log(JSON.stringify(payload.vc, null, 2));
  } catch (err) {
    console.error('✗ Verification failed:', err.message);
    process.exit(1);
  }
} else if (alg === 'ES256K') {
  // --- did:ethr / ES256K path ---
  const rpcUrl = process.env.POLYGON_RPC || 'https://1rpc.io/matic';
  const REGISTRY = '0xdCa7EF03e98e0DC2B855bE647C39ABe984fcF21B';

  const resolver = new Resolver(
    getEthrResolver({
      networks: [
        {
          name: '0x89',
          chainId: 137,
          rpcUrl,
          registry: REGISTRY,
        },
      ],
    }),
  );

  try {
    const result = await verifyCredential(jwt, resolver);
    const { issuer, subject, verifiableCredential: vc } = result;
    console.log('✓ Signature valid (ES256K / did:ethr Polygon)\n');
    console.log('Issuer: ', issuer);
    console.log('Subject:', subject);
    if (vc.issuanceDate) console.log('Issued: ', vc.issuanceDate);
    if (vc.expirationDate) console.log('Expires:', vc.expirationDate);
    console.log('\nVC:');
    console.log(JSON.stringify(vc.credentialSubject, null, 2));
  } catch (err) {
    console.error('✗ Verification failed:', err.message);
    process.exit(1);
  }
} else {
  console.error(`✗ Unsupported algorithm: ${alg}`);
  process.exit(1);
}
