#!/usr/bin/env node
/**
 * Generic DID/VC setup tool for client onboarding.
 *
 * Generates a complete, deployable DID/VC package for any agent-based organization:
 *   - Company did:web DID document
 *   - Per-agent DID documents
 *   - Ed25519 key pairs (company + per-agent)
 *   - JSON-LD credential schemas
 *   - W3C Status List 2021 scaffold
 *   - Signed VC-JWTs (identity + capability per agent)
 *
 * Usage:
 *   node tools/did-setup-client.mjs --domain example.com --agents agents.json --out ./client-output
 *
 * Agents file format (JSON):
 *   {
 *     "domain": "example.com",        // optional — overridden by --domain flag
 *     "companyName": "Example Corp",  // optional — defaults to domain
 *     "agents": [
 *       {
 *         "name": "ceo-agent",          // slug used in DID paths and file names (lowercase, hyphens only)
 *         "displayName": "CEO Agent",   // optional — defaults to name
 *         "role": "ceo",
 *         "title": "Chief Executive Officer",
 *         "capabilities": ["strategic direction", "hiring"],
 *         "reportsTo": null,            // optional — agent name slug or full DID
 *         "canCreateAgents": true,      // optional — default false
 *         "canSignTransactions": false  // optional — default false
 *       }
 *     ]
 *   }
 */

import { generateKeyPairSync, randomUUID } from 'crypto';
import { SignJWT, importJWK } from 'jose';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--') && i + 1 < argv.length) {
      args[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return args;
}

const args = parseArgs(process.argv);

if (!args.agents || !args.out) {
  console.error(
    'Usage: node tools/did-setup-client.mjs --domain <domain> --agents <agents.json> --out <output-dir>',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Load and validate agents roster
// ---------------------------------------------------------------------------

let roster;
try {
  roster = JSON.parse(readFileSync(resolve(args.agents), 'utf8'));
} catch (err) {
  console.error(`Error reading agents file: ${err.message}`);
  process.exit(1);
}

const domain = args.domain || roster.domain;
if (!domain) {
  console.error('Error: --domain is required (or set "domain" field in agents file)');
  process.exit(1);
}

const companyName = roster.companyName || domain;
const agents = roster.agents;

if (!Array.isArray(agents) || agents.length === 0) {
  console.error('Error: agents file must contain an "agents" array with at least one entry');
  process.exit(1);
}

for (const agent of agents) {
  if (!agent.name || !agent.role || !agent.title) {
    console.error(
      `Error: each agent must have "name", "role", and "title". Missing in: ${JSON.stringify(agent)}`,
    );
    process.exit(1);
  }
  if (!/^[a-z0-9-]+$/.test(agent.name)) {
    console.error(
      `Error: agent name must be lowercase alphanumeric with hyphens only: "${agent.name}"`,
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const outputDir = resolve(args.out);
const companyDid = `did:web:${domain}`;
const now = Math.floor(Date.now() / 1000);
const oneYear = now + 365 * 24 * 60 * 60;

// Derive schema type names from domain (e.g. "example.com" → "ExampleAgentIdentity")
const domainSlug = domain.split('.')[0];
const schemaSlug = domainSlug.charAt(0).toUpperCase() + domainSlug.slice(1);
const identitySchemaName = `${schemaSlug}AgentIdentity`;
const capabilitySchemaName = `${schemaSlug}AgentCapability`;

function write(relativePath, content) {
  const fullPath = join(outputDir, ...relativePath.split('/'));
  mkdirSync(dirname(fullPath), { recursive: true });
  const body = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  writeFileSync(fullPath, body);
}

console.log(`\nGenerating DID/VC package for ${companyName} (${domain})\n`);

// ---------------------------------------------------------------------------
// Step 1: Company Ed25519 key pair
// ---------------------------------------------------------------------------

const { publicKey: companyPub, privateKey: companyPriv } = generateKeyPairSync('ed25519');
const companyPublicJwk = companyPub.export({ format: 'jwk' });
const companyPrivateJwk = companyPriv.export({ format: 'jwk' });

write('private-keys/.gitignore', '*\n!.gitignore\n');
write('private-keys/company.jwk.json', {
  did: companyDid,
  publicKeyJwk: companyPublicJwk,
  privateKeyJwk: companyPrivateJwk,
});
console.log('✓ Company Ed25519 key pair    → private-keys/company.jwk.json');

// ---------------------------------------------------------------------------
// Step 2: Per-agent Ed25519 key pairs
// ---------------------------------------------------------------------------

const agentPublicKeys = {};
for (const agent of agents) {
  const { publicKey: pub, privateKey: priv } = generateKeyPairSync('ed25519');
  const publicJwk = pub.export({ format: 'jwk' });
  agentPublicKeys[agent.name] = publicJwk;
  write(`private-keys/${agent.name}.jwk.json`, {
    did: `${companyDid}:agents:${agent.name}`,
    publicKeyJwk: publicJwk,
    privateKeyJwk: priv.export({ format: 'jwk' }),
  });
  console.log(`✓ Agent key pair              → private-keys/${agent.name}.jwk.json`);
}

// ---------------------------------------------------------------------------
// Step 3: Company DID document
// ---------------------------------------------------------------------------

write('.well-known/did.json', {
  '@context': [
    'https://www.w3.org/ns/did/v1',
    'https://w3id.org/security/suites/jws-2020/v1',
  ],
  id: companyDid,
  verificationMethod: [
    {
      id: `${companyDid}#key-1`,
      type: 'JsonWebKey2020',
      controller: companyDid,
      publicKeyJwk: companyPublicJwk,
    },
  ],
  authentication: [`${companyDid}#key-1`],
  assertionMethod: [`${companyDid}#key-1`],
  capabilityDelegation: [`${companyDid}#key-1`],
  capabilityInvocation: [`${companyDid}#key-1`],
});
console.log('✓ Company DID document        → .well-known/did.json');

// ---------------------------------------------------------------------------
// Step 4: Agent DID documents
// ---------------------------------------------------------------------------

for (const agent of agents) {
  const agentDid = `${companyDid}:agents:${agent.name}`;
  write(`agents/${agent.name}/did.json`, {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/jws-2020/v1',
    ],
    id: agentDid,
    verificationMethod: [
      {
        id: `${agentDid}#key-1`,
        type: 'JsonWebKey2020',
        controller: agentDid,
        publicKeyJwk: agentPublicKeys[agent.name],
      },
    ],
    authentication: [`${agentDid}#key-1`],
    assertionMethod: [`${agentDid}#key-1`],
    capabilityDelegation: [`${agentDid}#key-1`],
    capabilityInvocation: [`${agentDid}#key-1`],
  });
  console.log(`✓ Agent DID document          → agents/${agent.name}/did.json`);
}

// ---------------------------------------------------------------------------
// Step 5: JSON-LD credential schemas
// ---------------------------------------------------------------------------

write(`schemas/${identitySchemaName}.jsonld`, {
  '@context': {
    '@version': 1.1,
    [identitySchemaName]: `https://${domain}/schemas/${identitySchemaName}#`,
    agentName:  `${identitySchemaName}:agentName`,
    agentRole:  `${identitySchemaName}:agentRole`,
    agentTitle: `${identitySchemaName}:agentTitle`,
    issuedBy:   `${identitySchemaName}:issuedBy`,
    agentId:    `${identitySchemaName}:agentId`,
    did:        `${identitySchemaName}:did`,
  },
});
write(`schemas/${capabilitySchemaName}.jsonld`, {
  '@context': {
    '@version': 1.1,
    [capabilitySchemaName]: `https://${domain}/schemas/${capabilitySchemaName}#`,
    agentName:           `${capabilitySchemaName}:agentName`,
    agentRole:           `${capabilitySchemaName}:agentRole`,
    authorizedBy:        `${capabilitySchemaName}:authorizedBy`,
    capabilities:        `${capabilitySchemaName}:capabilities`,
    reportsTo:           `${capabilitySchemaName}:reportsTo`,
    canCreateAgents:     `${capabilitySchemaName}:canCreateAgents`,
    canSignTransactions: `${capabilitySchemaName}:canSignTransactions`,
  },
});
console.log(`✓ JSON-LD schemas             → schemas/${identitySchemaName}.jsonld`);
console.log(`                                schemas/${capabilitySchemaName}.jsonld`);

// ---------------------------------------------------------------------------
// Step 6: W3C Status List 2021 scaffold
// ---------------------------------------------------------------------------

write('status-list/status-list-2021.json', {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://w3id.org/vc/status-list/2021/v1',
  ],
  id: `https://${domain}/status-list/status-list-2021.json`,
  type: ['VerifiableCredential', 'StatusList2021Credential'],
  issuer: companyDid,
  issuanceDate: new Date(now * 1000).toISOString(),
  credentialSubject: {
    id: `https://${domain}/status-list/status-list-2021.json#list`,
    type: 'StatusList2021',
    statusPurpose: 'revocation',
    // All-zeros bitstring (no credentials revoked), gzip-compressed + base64url
    encodedList: 'H4sIAAAAAAAAA-3BMQEAAADCoPVP7WsIoAAAAAAAAAAAAAAAAAAAeAMBtRBRAAA',
  },
});
console.log('✓ Status list scaffold        → status-list/status-list-2021.json');

// ---------------------------------------------------------------------------
// Step 7: Issue VC-JWTs (identity + capability per agent)
// ---------------------------------------------------------------------------

const companyPrivateKey = await importJWK({ ...companyPrivateJwk, crv: 'Ed25519' }, 'EdDSA');
const issuerKeyId = `${companyDid}#key-1`;

for (let i = 0; i < agents.length; i++) {
  const agent = agents[i];
  const agentDid = `${companyDid}:agents:${agent.name}`;
  const agentId = agent.id || randomUUID();
  // Each agent gets two consecutive status list indices
  const identityStatusIdx = i * 2;
  const capabilityStatusIdx = i * 2 + 1;

  const reportsTo = agent.reportsTo
    ? agent.reportsTo.startsWith('did:')
      ? agent.reportsTo
      : `${companyDid}:agents:${agent.reportsTo}`
    : undefined;

  // — Identity VC —

  const identityVc = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      `https://${domain}/schemas/${identitySchemaName}.jsonld`,
    ],
    type: ['VerifiableCredential', identitySchemaName],
    id: `urn:uuid:identity-${agentId}`,
    issuer: companyDid,
    issuanceDate: new Date(now * 1000).toISOString(),
    expirationDate: new Date(oneYear * 1000).toISOString(),
    credentialStatus: {
      id: `https://${domain}/status-list/status-list-2021.json#${identityStatusIdx}`,
      type: 'StatusList2021Entry',
      statusPurpose: 'revocation',
      statusListIndex: String(identityStatusIdx),
      statusListCredential: `https://${domain}/status-list/status-list-2021.json`,
    },
    credentialSubject: {
      id: agentDid,
      agentName: agent.displayName || agent.name,
      agentRole: agent.role,
      agentTitle: agent.title,
      issuedBy: companyName,
      agentId,
      did: agentDid,
    },
  };

  const identityJwt = await new SignJWT({ vc: identityVc })
    .setProtectedHeader({ alg: 'EdDSA', kid: issuerKeyId, typ: 'JWT' })
    .setIssuer(companyDid)
    .setSubject(agentDid)
    .setIssuedAt(now)
    .setExpirationTime(oneYear)
    .setJti(`urn:uuid:identity-${agentId}`)
    .sign(companyPrivateKey);

  write(`credentials/${agent.name}-identity.jwt`, identityJwt);
  console.log(`✓ Identity VC                 → credentials/${agent.name}-identity.jwt`);

  // — Capability VC —

  const capabilityVc = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      `https://${domain}/schemas/${capabilitySchemaName}.jsonld`,
    ],
    type: ['VerifiableCredential', capabilitySchemaName],
    id: `urn:uuid:capability-${agentId}`,
    issuer: companyDid,
    issuanceDate: new Date(now * 1000).toISOString(),
    expirationDate: new Date(oneYear * 1000).toISOString(),
    credentialStatus: {
      id: `https://${domain}/status-list/status-list-2021.json#${capabilityStatusIdx}`,
      type: 'StatusList2021Entry',
      statusPurpose: 'revocation',
      statusListIndex: String(capabilityStatusIdx),
      statusListCredential: `https://${domain}/status-list/status-list-2021.json`,
    },
    credentialSubject: {
      id: agentDid,
      agentName: agent.displayName || agent.name,
      agentRole: agent.role,
      authorizedBy: companyDid,
      capabilities: agent.capabilities || [],
      ...(reportsTo && { reportsTo }),
      canCreateAgents: agent.canCreateAgents ?? false,
      canSignTransactions: agent.canSignTransactions ?? false,
    },
  };

  const capabilityJwt = await new SignJWT({ vc: capabilityVc })
    .setProtectedHeader({ alg: 'EdDSA', kid: issuerKeyId, typ: 'JWT' })
    .setIssuer(companyDid)
    .setSubject(agentDid)
    .setIssuedAt(now)
    .setExpirationTime(oneYear)
    .setJti(`urn:uuid:capability-${agentId}`)
    .sign(companyPrivateKey);

  write(`credentials/${agent.name}-capability.jwt`, capabilityJwt);
  console.log(`✓ Capability VC               → credentials/${agent.name}-capability.jwt`);
}

// ---------------------------------------------------------------------------
// Deployment manifest
// ---------------------------------------------------------------------------

write('manifest.json', {
  domain,
  companyName,
  companyDid,
  generatedAt: new Date().toISOString(),
  agents: agents.map((a) => ({
    name: a.name,
    displayName: a.displayName || a.name,
    role: a.role,
    did: `${companyDid}:agents:${a.name}`,
    credentials: [
      `credentials/${a.name}-identity.jwt`,
      `credentials/${a.name}-capability.jwt`,
    ],
  })),
  deployment: {
    note: 'Serve all files (except private-keys/) from your domain root with Content-Type: application/json',
    routes: [
      {
        local: '.well-known/did.json',
        url: `https://${domain}/.well-known/did.json`,
      },
      ...agents.map((a) => ({
        local: `agents/${a.name}/did.json`,
        url: `https://${domain}/agents/${a.name}/did.json`,
      })),
      {
        local: 'schemas/',
        url: `https://${domain}/schemas/`,
      },
      {
        local: 'status-list/status-list-2021.json',
        url: `https://${domain}/status-list/status-list-2021.json`,
      },
    ],
  },
  security: {
    warning: 'private-keys/ must NEVER be deployed or committed to version control.',
    privateKeyFiles: [
      'private-keys/company.jwk.json',
      ...agents.map((a) => `private-keys/${a.name}.jwk.json`),
    ],
  },
});
console.log('✓ Deployment manifest         → manifest.json');

console.log(`\n⚠  SECURITY: private-keys/ must never be deployed or committed.\n`);
console.log(`Done. DID/VC package ready in: ${outputDir}`);
console.log(`\nVerify a credential:`);
console.log(`  node did/verify-credential.mjs ${args.out}/credentials/<agent>-identity.jwt\n`);
