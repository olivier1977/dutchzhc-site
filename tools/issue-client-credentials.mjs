#!/usr/bin/env node
/**
 * DZHC Client VC Issuance Workflow
 *
 * Usage:
 *   node tools/issue-client-credentials.mjs --intake <intake.json> [--out <dir>]
 *
 * Reads a completed intake-form JSON, generates the DID/VC package via
 * did-setup-client.mjs, verifies every credential, writes a deployment README,
 * and zips the delivery package (private-keys/ excluded).
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { createWriteStream } from 'fs';
import { createRequire } from 'module';
import { jwtVerify, importJWK } from 'jose';
import { ZipArchive } from 'archiver';
const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

function parseArgs(argv) {
  const a = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--') && i + 1 < argv.length) { a[argv[i].slice(2)] = argv[i + 1]; i++; }
  }
  return a;
}

const args = parseArgs(process.argv);

if (!args.intake) {
  console.error('Usage: node tools/issue-client-credentials.mjs --intake <intake.json> [--out <dir>]');
  process.exit(1);
}

// Load intake form
let intake;
try {
  intake = JSON.parse(readFileSync(resolve(args.intake), 'utf8'));
} catch (err) {
  console.error(`Error reading intake file: ${err.message}`);
  process.exit(1);
}

for (const field of ['clientName', 'domain', 'billingContact', 'agents']) {
  if (!intake[field]) { console.error(`Missing required field: "${field}"`); process.exit(1); }
}
if (!intake.billingContact.email) { console.error('billingContact must have an email'); process.exit(1); }
if (!Array.isArray(intake.agents) || intake.agents.length === 0) {
  console.error('agents array must have at least one entry'); process.exit(1);
}

const domainSlug = intake.domain.replace(/\./g, '-');
const outDir = args.out ? resolve(args.out) : resolve(repoRoot, `client-output/${domainSlug}`);
const zipPath = `${outDir}-delivery.zip`;

console.log('\n=== DZHC VC Issuance Workflow ===');
console.log(`Client:  ${intake.clientName}`);
console.log(`Domain:  ${intake.domain}`);
console.log(`Agents:  ${intake.agents.map(a => a.name).join(', ')}`);
console.log(`Output:  ${outDir}`);
console.log(`ZIP:     ${zipPath}\n`);

// Step 1: Write roster file
mkdirSync(outDir, { recursive: true });
const rosterPath = join(outDir, '_roster.json');
writeFileSync(rosterPath, JSON.stringify({
  domain: intake.domain,
  companyName: intake.clientName,
  agents: intake.agents.map(a => ({
    name: a.name,
    displayName: a.displayName || a.name,
    role: a.role,
    title: a.title,
    capabilities: a.capabilities || [],
    ...(a.reportsTo && { reportsTo: a.reportsTo }),
    canCreateAgents: a.canCreateAgents ?? false,
    canSignTransactions: a.canSignTransactions ?? false,
    ...(a.paperclipId && { id: a.paperclipId }),
  })),
}, null, 2));
console.log('[1/5] Roster written');

// Step 2: Generate DID/VC package
console.log('\n[2/5] Running did-setup-client.mjs ...');
execFileSync(process.execPath, [
  join(repoRoot, 'tools/did-setup-client.mjs'),
  '--domain', intake.domain,
  '--agents', rosterPath,
  '--out', outDir,
], { stdio: 'inherit', cwd: repoRoot });

// Step 3: Verify credentials against the client's own company DID document
console.log('\n[3/5] Verifying credentials ...');
const credsDir = join(outDir, 'credentials');
const jwtFiles = readdirSync(credsDir).filter(f => f.endsWith('.jwt'));
if (jwtFiles.length === 0) { console.error('No JWT files found'); process.exit(1); }

// Load the client company public key from the generated output
const clientDidDoc = JSON.parse(readFileSync(join(outDir, '.well-known/did.json'), 'utf8'));
const clientPublicJwk = clientDidDoc.verificationMethod[0].publicKeyJwk;
const clientPublicKey = await importJWK({ ...clientPublicJwk, crv: 'Ed25519' }, 'EdDSA');

let allPassed = true;
for (const jwtFile of jwtFiles) {
  const jwt = readFileSync(join(credsDir, jwtFile), 'utf8').trim();
  try {
    await jwtVerify(jwt, clientPublicKey);
    console.log(`  OK   ${jwtFile}`);
  } catch (err) {
    console.error(`  FAIL ${jwtFile}: ${err.message}`);
    allPassed = false;
  }
}
if (!allPassed) { console.error('\nVerification failed — aborting'); process.exit(1); }
console.log(`\nAll ${jwtFiles.length} credentials verified.`);

// Step 4: Write delivery README
console.log('\n[4/5] Writing delivery README ...');
const manifest = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8'));
const bc = intake.billingContact;
const lines = [
  `# DID/VC Delivery Package — ${intake.clientName}`,
  ``,
  `**Domain:** \`${intake.domain}\`  `,
  `**Generated:** ${new Date().toISOString()}  `,
  `**Billing contact:** ${bc.name} <${bc.email}>  `,
  `**Retention period:** ${intake.retentionPeriodDays || 365} days`,
  ``,
  `---`,
  ``,
  `## Files`,
  ``,
  `| File | Deploy URL | Purpose |`,
  `|------|-----------|---------|`,
  `| \`.well-known/did.json\` | \`https://${intake.domain}/.well-known/did.json\` | Company DID document |`,
  ...manifest.agents.map(a =>
    `| \`agents/${a.name}/did.json\` | \`https://${intake.domain}/agents/${a.name}/did.json\` | DID — ${a.displayName} |`
  ),
  `| \`schemas/\` | \`https://${intake.domain}/schemas/\` | JSON-LD schemas |`,
  `| \`status-list/status-list-2021.json\` | \`https://${intake.domain}/status-list/status-list-2021.json\` | Revocation status list |`,
  ...manifest.agents.flatMap(a => [
    `| \`credentials/${a.name}-identity.jwt\` | _(hand to agent)_ | Identity VC — ${a.displayName} |`,
    `| \`credentials/${a.name}-capability.jwt\` | _(hand to agent)_ | Capability VC — ${a.displayName} |`,
  ]),
  ``,
  `---`,
  ``,
  `## Deployment`,
  ``,
  `1. Serve all files (except \`private-keys/\`, \`credentials/\`) from your domain root with \`Content-Type: application/json\`.`,
  `2. **Never deploy \`private-keys/\`.** Store in a secrets manager.`,
  `3. Hand each agent its \`credentials/<name>-identity.jwt\` and \`credentials/<name>-capability.jwt\`.`,
  `4. Verify a credential: \`node did/verify-credential.mjs credentials/<agent>-identity.jwt\``,
  `5. Revoke: update and redeploy \`status-list/status-list-2021.json\`.`,
  ``,
  `---`,
  ``,
  `## Agents`,
  ``,
  ...manifest.agents.flatMap(a => [
    `### ${a.displayName}`,
    `- **DID:** \`${a.did}\``,
    `- **Credentials:** \`${a.credentials.join('\`, \`')}\``,
    ``,
  ]),
  `_Issued by DZHC. See [client onboarding guide](https://dzhc.agents/docs/client-onboarding-guide.md) for support._`,
];
writeFileSync(join(outDir, 'README.md'), lines.join('\n'));
console.log('README.md written');

// Step 5: Create ZIP (exclude private-keys/ and _roster.json)
console.log('\n[5/5] Creating delivery ZIP ...');
await new Promise((res, rej) => {
  const output = createWriteStream(zipPath);
  const archive = new ZipArchive({ zlib: { level: 9 } });
  output.on('close', res);
  archive.on('error', rej);
  archive.pipe(output);
  function addDir(dir, base) {
    for (const entry of readdirSync(dir)) {
      if (base === '' && (entry === 'private-keys' || entry === '_roster.json')) continue;
      const full = join(dir, entry);
      const rel = base ? `${base}/${entry}` : entry;
      if (statSync(full).isDirectory()) addDir(full, rel);
      else archive.file(full, { name: rel });
    }
  }
  addDir(outDir, '');
  archive.finalize();
});
console.log(`ZIP created -> ${zipPath}`);

console.log(`
=== Done ===
Client:       ${intake.clientName}
Credentials:  ${jwtFiles.length} issued and verified
Working tree: ${outDir}
Delivery ZIP: ${zipPath}

Next: send the ZIP to the client, store private-keys/ in a secrets manager.
`);

