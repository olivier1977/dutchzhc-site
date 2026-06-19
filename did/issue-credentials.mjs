/**
 * DutchZHC Verifiable Credential Issuance Script
 *
 * Issues signed VC-JWTs for each agent using:
 *   - did:web path: company Ed25519 key / EdDSA (jose)
 *   - did:ethr path: company secp256k1 key / ES256K (did-jwt-vc) — Polygon
 *
 * Output:
 *   did/credentials/<agent>-identity.jwt          (EdDSA, did:web)
 *   did/credentials/<agent>-capability.jwt         (EdDSA, did:web)
 *   did/credentials/<agent>-identity-ethr.jwt      (ES256K, did:ethr Polygon)
 *   did/credentials/<agent>-capability-ethr.jwt    (ES256K, did:ethr Polygon)
 *
 * Usage: node did/issue-credentials.mjs
 */

import { SignJWT, importJWK } from 'jose';
import { createVerifiableCredentialJwt } from 'did-jwt-vc';
import { ES256KSigner, hexToBytes } from 'did-jwt';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Load company did:web key (EdDSA issuer) ---
const webKeyData = JSON.parse(readFileSync(join(__dirname, 'private-keys/dutchzhc.jwk.json'), 'utf8'));
const issuerWebDid = webKeyData.did;
const issuerWebKeyId = `${issuerWebDid}#key-1`;
const webPrivateKey = await importJWK({ ...webKeyData.privateKeyJwk, crv: 'Ed25519' }, 'EdDSA');

// --- Load company did:ethr key (ES256K issuer) ---
const ethKeyPath = join(__dirname, 'private-keys/dutchzhc.eth.json');
let ethIssuer = null;
if (existsSync(ethKeyPath)) {
  const ethKeyData = JSON.parse(readFileSync(ethKeyPath, 'utf8'));
  const signer = ES256KSigner(hexToBytes(ethKeyData.privateKey.replace(/^0x/, '')));
  ethIssuer = { did: ethKeyData.did, signer, alg: 'ES256K' };
  console.log(`Ethereum issuer: ${ethKeyData.did}`);
} else {
  console.warn('⚠  did/private-keys/dutchzhc.eth.json not found — skipping did:ethr VCs');
  console.warn('   Run: node did/create-ethr-dids.mjs');
}

const now = Math.floor(Date.now() / 1000);
const oneYear = now + 365 * 24 * 60 * 60;

const agents = [
  {
    name: 'episkope-duo',
    displayName: 'Episkope Duo',
    role: 'ceo',
    title: 'Chief Executive Officer',
    paperclipId: 'c9056c00-ea3f-4419-b7e6-b79428d815c8',
    webDid: `${issuerWebDid}:agents:episkope-duo`,
    capabilities: ['strategic direction', 'hiring', 'governance', 'agent management', 'budget oversight'],
    reportsTo: null,
    canCreateAgents: true,
    canSignTransactions: false,
    budgetAuthorityZHR: null,
  },
  {
    name: 'founding-engineer',
    displayName: 'Founding Engineer',
    role: 'engineer',
    title: 'Founding Engineer',
    paperclipId: 'c71dc619-8427-4eae-89e5-d6d59690c91f',
    webDid: `${issuerWebDid}:agents:founding-engineer`,
    capabilities: ['software development', 'architecture', 'smart contracts', 'web infrastructure'],
    reportsTo: `${issuerWebDid}:agents:episkope-duo`,
    canCreateAgents: false,
    canSignTransactions: false,
    budgetAuthorityZHR: null,
  },
  {
    name: 'marcom',
    displayName: 'Marcom',
    role: 'designer',
    title: 'Marketing & Communications Specialist',
    paperclipId: 'e4758e7b-d39e-4cea-8da1-137e25fe70bf',
    webDid: `${issuerWebDid}:agents:marcom`,
    capabilities: ['marketing', 'communications', 'PDF reports', 'web design', 'social media content'],
    reportsTo: `${issuerWebDid}:agents:episkope-duo`,
    canCreateAgents: false,
    canSignTransactions: false,
    budgetAuthorityZHR: null,
  },
  {
    name: 'marcom-creative',
    displayName: 'Marcom Creative',
    role: 'designer',
    title: 'Creative Marketing Specialist',
    paperclipId: 'b172e8f5-931a-483e-9a9e-fdab9611f2d7',
    webDid: `${issuerWebDid}:agents:marcom-creative`,
    capabilities: ['visual content', 'image generation', 'brand assets', 'UI prototypes', 'social media visuals'],
    reportsTo: `${issuerWebDid}:agents:episkope-duo`,
    canCreateAgents: false,
    canSignTransactions: false,
    budgetAuthorityZHR: null,
  },
  {
    name: 'cfo',
    displayName: 'CFO',
    role: 'cfo',
    title: 'Chief Financial Officer',
    paperclipId: '99f1be89-5d35-4321-a64a-31716e857bbd',
    webDid: `${issuerWebDid}:agents:cfo`,
    capabilities: ['financial operations', 'budgeting', 'accounting', 'treasury', 'crypto asset management'],
    reportsTo: `${issuerWebDid}:agents:episkope-duo`,
    canCreateAgents: false,
    canSignTransactions: true,
    budgetAuthorityZHR: 0,
  },
  {
    name: 'ciso',
    displayName: 'CISO',
    role: 'engineer',
    title: 'Chief Information Security Officer',
    paperclipId: 'fa319d33-0e57-4a3a-a44f-35d1a3deafbc',
    webDid: `${issuerWebDid}:agents:ciso`,
    capabilities: ['information security', 'risk management', 'security auditing', 'DID & VC infrastructure', 'compliance'],
    reportsTo: `${issuerWebDid}:agents:episkope-duo`,
    canCreateAgents: false,
    canSignTransactions: false,
    budgetAuthorityZHR: null,
  },
  {
    name: 'legal-counsel',
    displayName: 'Legal Counsel',
    role: 'general',
    title: 'Legal Counsel',
    paperclipId: 'a7baebb3-eb6e-43b5-9164-5047b7ae7f69',
    webDid: `${issuerWebDid}:agents:legal-counsel`,
    capabilities: ['legal advisory', 'contract review', 'compliance assessment', 'AI regulatory analysis', 'on-chain governance review'],
    reportsTo: `${issuerWebDid}:agents:episkope-duo`,
    canCreateAgents: false,
    canSignTransactions: false,
    budgetAuthorityZHR: null,
  },
];

mkdirSync(join(__dirname, 'credentials'), { recursive: true });

for (const agent of agents) {
  // Load agent's did:ethr DID if available
  const agentEthKeyPath = join(__dirname, `private-keys/${agent.name}.eth.json`);
  const agentEthDid = existsSync(agentEthKeyPath)
    ? JSON.parse(readFileSync(agentEthKeyPath, 'utf8')).did
    : null;

  // =====================================================================
  // did:web path — EdDSA (unchanged)
  // =====================================================================

  const identityVc = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://dutchzerohumancompany.com/schemas/DutchZHCAgentIdentity.jsonld',
    ],
    type: ['VerifiableCredential', 'DutchZHCAgentIdentity'],
    id: `urn:uuid:identity-${agent.paperclipId}`,
    issuer: issuerWebDid,
    issuanceDate: new Date(now * 1000).toISOString(),
    expirationDate: new Date(oneYear * 1000).toISOString(),
    credentialSubject: {
      id: agent.webDid,
      agentName: agent.displayName,
      agentRole: agent.role,
      agentTitle: agent.title,
      issuedBy: 'DutchZHC (Dutch Zero Human Company)',
      paperclipId: agent.paperclipId,
      did: agent.webDid,
      ...(agentEthDid && { ethrDid: agentEthDid }),
    },
  };

  const identityJwt = await new SignJWT({ vc: identityVc })
    .setProtectedHeader({ alg: 'EdDSA', kid: issuerWebKeyId, typ: 'JWT' })
    .setIssuer(issuerWebDid)
    .setSubject(agent.webDid)
    .setIssuedAt(now)
    .setExpirationTime(oneYear)
    .setJti(`urn:uuid:identity-${agent.paperclipId}`)
    .sign(webPrivateKey);

  writeFileSync(join(__dirname, `credentials/${agent.name}-identity.jwt`), identityJwt);
  console.log(`✓ [web] Identity VC: ${agent.name}-identity.jwt`);

  const capabilityVc = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://dutchzerohumancompany.com/schemas/DutchZHCAgentCapability.jsonld',
    ],
    type: ['VerifiableCredential', 'DutchZHCAgentCapability'],
    id: `urn:uuid:capability-${agent.paperclipId}`,
    issuer: issuerWebDid,
    issuanceDate: new Date(now * 1000).toISOString(),
    expirationDate: new Date(oneYear * 1000).toISOString(),
    credentialSubject: {
      id: agent.webDid,
      agentName: agent.displayName,
      agentRole: agent.role,
      authorizedBy: issuerWebDid,
      capabilities: agent.capabilities,
      ...(agent.reportsTo && { reportsTo: agent.reportsTo }),
      canCreateAgents: agent.canCreateAgents,
      canSignTransactions: agent.canSignTransactions,
      ...(agent.budgetAuthorityZHR !== null && { budgetAuthorityZHR: agent.budgetAuthorityZHR }),
    },
  };

  const capabilityJwt = await new SignJWT({ vc: capabilityVc })
    .setProtectedHeader({ alg: 'EdDSA', kid: issuerWebKeyId, typ: 'JWT' })
    .setIssuer(issuerWebDid)
    .setSubject(agent.webDid)
    .setIssuedAt(now)
    .setExpirationTime(oneYear)
    .setJti(`urn:uuid:capability-${agent.paperclipId}`)
    .sign(webPrivateKey);

  writeFileSync(join(__dirname, `credentials/${agent.name}-capability.jwt`), capabilityJwt);
  console.log(`✓ [web] Capability VC: ${agent.name}-capability.jwt`);

  // =====================================================================
  // did:ethr path — ES256K (Polygon)
  // =====================================================================

  if (!ethIssuer || !agentEthDid) {
    console.log(`  [ethr] Skipped ${agent.name} — eth keys not found`);
    continue;
  }

  const identityEthrPayload = {
    sub: agentEthDid,
    nbf: now,
    exp: oneYear,
    vc: {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://dutchzerohumancompany.com/schemas/DutchZHCAgentIdentity.jsonld',
      ],
      type: ['VerifiableCredential', 'DutchZHCAgentIdentity'],
      credentialSubject: {
        id: agentEthDid,
        agentName: agent.displayName,
        agentRole: agent.role,
        agentTitle: agent.title,
        issuedBy: 'DutchZHC (Dutch Zero Human Company)',
        paperclipId: agent.paperclipId,
        webDid: agent.webDid,
        ethrDid: agentEthDid,
      },
    },
  };

  const identityEthrJwt = await createVerifiableCredentialJwt(identityEthrPayload, ethIssuer);
  writeFileSync(join(__dirname, `credentials/${agent.name}-identity-ethr.jwt`), identityEthrJwt);
  console.log(`✓ [ethr] Identity VC: ${agent.name}-identity-ethr.jwt`);

  const capabilityEthrPayload = {
    sub: agentEthDid,
    nbf: now,
    exp: oneYear,
    vc: {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://dutchzerohumancompany.com/schemas/DutchZHCAgentCapability.jsonld',
      ],
      type: ['VerifiableCredential', 'DutchZHCAgentCapability'],
      credentialSubject: {
        id: agentEthDid,
        agentName: agent.displayName,
        agentRole: agent.role,
        authorizedBy: ethIssuer.did,
        capabilities: agent.capabilities,
        ...(agent.reportsTo && { reportsTo: agent.reportsTo }),
        canCreateAgents: agent.canCreateAgents,
        canSignTransactions: agent.canSignTransactions,
        ...(agent.budgetAuthorityZHR !== null && { budgetAuthorityZHR: agent.budgetAuthorityZHR }),
      },
    },
  };

  const capabilityEthrJwt = await createVerifiableCredentialJwt(capabilityEthrPayload, ethIssuer);
  writeFileSync(join(__dirname, `credentials/${agent.name}-capability-ethr.jwt`), capabilityEthrJwt);
  console.log(`✓ [ethr] Capability VC: ${agent.name}-capability-ethr.jwt`);
}

console.log('\nAll credentials issued to did/credentials/');
