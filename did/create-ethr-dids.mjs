/**
 * DutchZHC Ethereum DID Setup Script (Phase 1 — Polygon)
 *
 * Generates secp256k1 wallets for the company and each agent,
 * saves private keys to did/private-keys/<name>.eth.json (gitignored),
 * and updates each did:web DID document with an alsoKnownAs link to the
 * corresponding did:ethr Polygon DID.
 *
 * With --register: writes service-endpoint DID attributes on Polygon via
 * the EthereumDIDRegistry contract. Requires POLYGON_RPC env var and MATIC
 * in each wallet for gas.
 *
 * Usage:
 *   node did/create-ethr-dids.mjs
 *   POLYGON_RPC=https://polygon-rpc.com node did/create-ethr-dids.mjs --register
 */

import { Wallet } from 'ethers';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keysDir = join(__dirname, 'private-keys');
mkdirSync(keysDir, { recursive: true });

const POLYGON_CHAIN_ID = 137;
const REGISTRY_ADDRESS = '0xdCa7EF03e98e0DC2B855bE647C39ABe984fcF21B';
const BASE_URL = 'https://dutchzerohumancompany.com';

// Company + each agent: name, web2 DID doc path, service endpoint
const entities = [
  {
    name: 'dutchzhc',
    didDocPath: join(__dirname, '.well-known/did.json'),
    serviceUrl: BASE_URL,
  },
  {
    name: 'episkope-duo',
    didDocPath: join(__dirname, 'agents/episkope-duo/did.json'),
    serviceUrl: `${BASE_URL}/agents/episkope-duo/did.json`,
  },
  {
    name: 'founding-engineer',
    didDocPath: join(__dirname, 'agents/founding-engineer/did.json'),
    serviceUrl: `${BASE_URL}/agents/founding-engineer/did.json`,
  },
  {
    name: 'marcom',
    didDocPath: join(__dirname, 'agents/marcom/did.json'),
    serviceUrl: `${BASE_URL}/agents/marcom/did.json`,
  },
  {
    name: 'marcom-creative',
    didDocPath: join(__dirname, 'agents/marcom-creative/did.json'),
    serviceUrl: `${BASE_URL}/agents/marcom-creative/did.json`,
  },
  {
    name: 'cfo',
    didDocPath: join(__dirname, 'agents/cfo/did.json'),
    serviceUrl: `${BASE_URL}/agents/cfo/did.json`,
  },
  {
    name: 'ciso',
    didDocPath: join(__dirname, 'agents/ciso/did.json'),
    serviceUrl: `${BASE_URL}/agents/ciso/did.json`,
  },
  {
    name: 'legal-counsel',
    didDocPath: join(__dirname, 'agents/legal-counsel/did.json'),
    serviceUrl: `${BASE_URL}/agents/legal-counsel/did.json`,
  },
];

// did:ethr on Polygon mainnet (chainId 137 = 0x89)
function toEthrDid(address) {
  return `did:ethr:0x89:${address.toLowerCase()}`;
}

const results = [];

// --- Step 1: Generate / load keys, update DID documents ---
for (const entity of entities) {
  const keyPath = join(keysDir, `${entity.name}.eth.json`);

  let address, privateKey, publicKey;

  if (existsSync(keyPath)) {
    const stored = JSON.parse(readFileSync(keyPath, 'utf8'));
    address = stored.address;
    privateKey = stored.privateKey;
    publicKey = stored.publicKey;
    console.log(`↩  Key exists: ${entity.name} (${stored.did})`);
  } else {
    const wallet = Wallet.createRandom();
    address = wallet.address.toLowerCase();
    privateKey = wallet.privateKey;
    publicKey = wallet.signingKey.compressedPublicKey;

    const keyData = {
      did: toEthrDid(address),
      address,
      privateKey,
      publicKey,
    };
    writeFileSync(keyPath, JSON.stringify(keyData, null, 2));
    console.log(`✓  Generated: ${entity.name} → ${keyData.did}`);
  }

  const ethrDid = toEthrDid(address);
  results.push({ ...entity, ethrDid, address, privateKey });

  // Update did:web DID document with alsoKnownAs
  if (existsSync(entity.didDocPath)) {
    const doc = JSON.parse(readFileSync(entity.didDocPath, 'utf8'));
    const alreadyLinked = (doc.alsoKnownAs || []).includes(ethrDid);
    if (!alreadyLinked) {
      doc.alsoKnownAs = [...(doc.alsoKnownAs || []), ethrDid];
      writeFileSync(entity.didDocPath, JSON.stringify(doc, null, 2) + '\n');
      console.log(`  ↳ alsoKnownAs updated in ${entity.name} DID doc`);
    }
  }
}

// --- Summary ---
console.log('\n--- Ethereum DID Summary (Polygon) ---');
for (const r of results) {
  console.log(`${r.name.padEnd(20)} ${r.ethrDid}`);
}
console.log(`\nRegistry: ${REGISTRY_ADDRESS}`);
console.log(`Chain:    Polygon mainnet (chainId ${POLYGON_CHAIN_ID})`);

// --- Step 2 (optional): Register service attributes on-chain ---
if (!process.argv.includes('--register')) {
  console.log('\nSkipping on-chain registration. Run with --register and POLYGON_RPC env var to register.');
  console.log('Each wallet needs MATIC for gas. Fund the addresses in did/private-keys/*.eth.json');
  process.exit(0);
}

const rpcUrl = process.env.POLYGON_RPC;
if (!rpcUrl) {
  console.error('\n✗ POLYGON_RPC environment variable required for --register');
  process.exit(1);
}

console.log(`\n--- Registering DID attributes on Polygon via ${rpcUrl} ---`);

const { JsonRpcProvider } = await import('ethers');
const { EthrDID } = await import('ethr-did');

const provider = new JsonRpcProvider(rpcUrl, POLYGON_CHAIN_ID, { batchMaxCount: 1 });

for (const entity of results) {
  const ethrDid = new EthrDID({
    identifier: entity.address,
    privateKey: entity.privateKey.replace(/^0x/, ''),
    provider,
    chainNameOrId: POLYGON_CHAIN_ID,
    registry: REGISTRY_ADDRESS,
  });

  try {
    const serviceValue = JSON.stringify({
      type: 'LinkedDomains',
      serviceEndpoint: entity.serviceUrl,
    });
    const txHash = await ethrDid.setAttribute(
      'did/svc/LinkedDomains',
      serviceValue,
      365 * 24 * 60 * 60,
    );
    console.log(`✓ ${entity.name}: setAttribute tx ${txHash}`);
  } catch (err) {
    console.error(`✗ ${entity.name}: ${err.message}`);
  }
}

console.log('\nDone. DID attributes registered on Polygon.');
