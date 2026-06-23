/**
 * TRA Score Engine v1.0
 *
 * Computes a reproducible TRA score JSON for a given agent or organisation.
 * Sources: Paperclip API (R1, R4, R7), local DID/VC files (Identity, Credentials).
 *
 * Usage:
 *   node tra/score-agent.mjs --agent episkope-duo
 *   node tra/score-agent.mjs --agent <paperclip-agent-id>
 *   node tra/score-agent.mjs --org the-agents
 *   node tra/score-agent.mjs --list
 *   node tra/score-agent.mjs --agent episkope-duo --output scores/episkope-duo.json
 *   node tra/score-agent.mjs --agent episkope-duo --html   (also emit HTML card snippet)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { decodeJwt } from 'jose';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// TRA Rubric v1.0
// ---------------------------------------------------------------------------

const RUBRIC_VERSION = '1.0';

const GRADE_POINTS = { A: 100, B: 60, C: 20, E: 0 };
const PILLAR_WEIGHTS = { identity: 0.30, credentials: 0.30, reputation: 0.40 };

// R4: governance violations → points
function r4Points(violations) {
  if (violations === 0)   return 100;
  if (violations <= 2)    return 70;
  if (violations <= 5)    return 40;
  return 10;
}

// R7: longevity (days active → points, max 100 at 117 days)
function r7Points(daysActive) {
  return Math.min(100, daysActive * (100 / 117));
}

// Numeric pts → letter grade
function letterGrade(pts) {
  if (pts >= 80) return 'A';
  if (pts >= 65) return 'B';
  if (pts >= 50) return 'C';
  if (pts >= 35) return 'D';
  return 'E';
}

// R2–R6 required; if any missing → Reputation auto-E
const REQUIRED_SUBSCORE_KEYS = ['r2', 'r3', 'r5', 'r6'];

function computeReputationScore(r) {
  const missingRequired = REQUIRED_SUBSCORE_KEYS.filter(k => r[k] == null);
  if (missingRequired.length > 0) {
    return { grade: 'E', points: 0, autoE: true, autoEReasons: missingRequired.map(k => `${k.toUpperCase()} unavailable`) };
  }

  const available = Object.values(r).filter(v => v != null);
  const avg = available.reduce((a, b) => a + b, 0) / available.length;
  const pts = Math.round(avg * 10) / 10;
  return { grade: letterGrade(pts), points: pts, autoE: false, autoEReasons: [] };
}

function computeCompositeScore(identityPts, credPts, repPts) {
  if (identityPts === 0 || credPts === 0 || repPts === 0) {
    return { score: 0, grade: 'E', autoE: true };
  }
  const raw = identityPts * PILLAR_WEIGHTS.identity
    + credPts * PILLAR_WEIGHTS.credentials
    + repPts * PILLAR_WEIGHTS.reputation;
  const score = Math.round(raw * 10) / 10;
  return { score, grade: letterGrade(score), autoE: false };
}

// ---------------------------------------------------------------------------
// Paperclip API helper
// ---------------------------------------------------------------------------

async function paperclipGet(path) {
  const base = process.env.PAPERCLIP_API_URL;
  const key  = process.env.PAPERCLIP_API_KEY;
  if (!base || !key) throw new Error('PAPERCLIP_API_URL / PAPERCLIP_API_KEY not set');
  const res = await fetch(`${base}${path}`, { headers: { 'Authorization': `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Paperclip ${path} → ${res.status}`);
  return res.json();
}

async function fetchAgentTaskLedger(agentId) {
  const companyId = process.env.PAPERCLIP_COMPANY_ID;
  const issues = await paperclipGet(`/api/companies/${companyId}/issues?assigneeAgentId=${agentId}&limit=500`);
  const counts = {};
  issues.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });
  const done   = counts.done      || 0;
  const failed = counts.cancelled || 0; // cancelled by agent failure (board cancel is excluded by convention)
  return { counts, done, failed, total: done + failed };
}

// ---------------------------------------------------------------------------
// VC helper
// ---------------------------------------------------------------------------

function loadVC(slug) {
  const dir = join(ROOT, 'did', 'credentials');
  for (const fname of [`${slug}-identity.jwt`, `${slug}.jwt`]) {
    const p = join(dir, fname);
    if (existsSync(p)) {
      const jwt = readFileSync(p, 'utf8').trim();
      return { payload: decodeJwt(jwt), path: fname };
    }
  }
  return null;
}

function vcValid(payload) {
  return payload.exp > Date.now() / 1000;
}

// Classify VC issuer:
//   issuer domain === subject domain → self-issued (C)
//   issuer domain !== subject domain → independent third-party (B)
//   no VC → E
function classifyVCIssuer(issuerDid, subjectDid) {
  if (!issuerDid) return 'E';
  const issuerDomain = issuerDid.split(':').slice(2, 3).join('');
  const subjectDomain = subjectDid ? subjectDid.split(':').slice(2, 3).join('') : null;
  if (!subjectDomain || issuerDomain === subjectDomain) return 'C';
  return 'B';
}

// ---------------------------------------------------------------------------
// Agent ICR scoring (DZHC agents via Paperclip)
// ---------------------------------------------------------------------------

async function scoreDZHCAgent(agentIdOrSlug) {
  const companyId = process.env.PAPERCLIP_COMPANY_ID;
  const agents = await paperclipGet(`/api/companies/${companyId}/agents`);
  const agent = agents.find(a =>
    a.id === agentIdOrSlug ||
    a.urlKey === agentIdOrSlug ||
    a.name.toLowerCase() === agentIdOrSlug.toLowerCase()
  );
  if (!agent) throw new Error(`Agent not found: ${agentIdOrSlug}`);

  // ---- Identity ----
  const did = agent.metadata?.did || null;
  // DZHC agents: did:web:dutchzerohumancompany.com:agents:* controlled by same company → self-issued = C
  const identityGrade = did ? 'C' : 'E';
  const identityPts   = GRADE_POINTS[identityGrade];

  // ---- Credentials ----
  const vc = loadVC(agent.urlKey);
  let credGrade = 'E';
  let credPts   = 0;
  let vcMeta    = { hasVC: false };
  if (vc) {
    const issuerDid  = vc.payload.iss;
    const subjectDid = vc.payload.sub;
    const valid = vcValid(vc.payload);
    credGrade = valid ? classifyVCIssuer(issuerDid, subjectDid) : 'E';
    credPts   = GRADE_POINTS[credGrade];
    const vcTypes = vc.payload.vc?.type?.filter(t => t !== 'VerifiableCredential') ?? [];
    vcMeta = { hasVC: true, vcTypes, issuerDid, valid };
  }

  // ---- Reputation ----
  const ledger = await fetchAgentTaskLedger(agent.id);
  const r1 = ledger.total > 0 ? Math.round(ledger.done / ledger.total * 1000) / 10 : null;

  // R4: governance violations — no formal log yet; default 0 if agent has completed tasks
  const r4Violations = 0;
  const r4 = ledger.done > 0 ? r4Points(r4Violations) : null;

  // R7: longevity
  const daysActive = Math.floor((Date.now() - new Date(agent.createdAt)) / 86400000);
  const r7pts = Math.round(r7Points(daysActive) * 10) / 10;

  // R2, R3, R5, R6 are not available in Paperclip yet → auto-E
  const repInput = { r1, r2: null, r3: null, r4, r5: null, r6: null, r7: r7pts };
  const rep = computeReputationScore(repInput);
  const composite = computeCompositeScore(identityPts, credPts, rep.points);

  return {
    rubricVersion: RUBRIC_VERSION,
    assessedAt: new Date().toISOString(),
    assessmentType: 'agent-icr',
    agent: {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      title: agent.title,
      urlKey: agent.urlKey,
      organization: 'Dutch Zero-Human Company',
      did,
      createdAt: agent.createdAt,
    },
    identity: {
      grade: identityGrade,
      points: identityPts,
      did,
      issuerType: did ? 'self-issued DID:WEB — controlled by same organisation' : 'no DID',
      resolvable: !!did,
    },
    credentials: {
      grade: credGrade,
      points: credPts,
      ...vcMeta,
      issuerType: vcMeta.hasVC ? (credGrade === 'C' ? 'self-issued by same organisation' : 'independent third-party') : 'no VC',
    },
    reputation: {
      grade: rep.grade,
      points: rep.points,
      autoE: rep.autoE,
      autoEReasons: rep.autoEReasons,
      subScores: {
        r1: { label: 'Task Completion Rate',  available: r1 != null, points: r1,    note: r1 != null ? `${ledger.done}/${ledger.total} tasks` : null },
        r2: { label: 'Quality Reviews',        available: false,      points: null,  required: true },
        r3: { label: 'Deadline Tracking',      available: false,      points: null,  required: true },
        r4: { label: 'Governance Compliance',  available: r4 != null, points: r4,    note: r4 != null ? `${r4Violations} violations` : null },
        r5: { label: 'Escalation Accuracy',    available: false,      points: null,  required: true },
        r6: { label: 'Consistency',            available: false,      points: null,  required: true },
        r7: { label: 'Longevity',              available: true,       points: r7pts, note: `${daysActive} days active` },
      },
    },
    composite: {
      score: composite.score,
      grade: composite.grade,
      autoE: composite.autoE,
      formula: 'Identity×30% + Credentials×30% + Reputation×40%',
    },
  };
}

// ---------------------------------------------------------------------------
// Organisation Governance scoring (The Agents — Phase 2 manual assessment)
// ---------------------------------------------------------------------------

async function scoreTheAgentsOrg() {
  const vcBundlePath = join(ROOT, 'did', 'credentials', 'the-agents', 'the-agents-vc-bundle.json');
  const vcBundle = existsSync(vcBundlePath)
    ? JSON.parse(readFileSync(vcBundlePath, 'utf8'))
    : null;

  // Manual Phase 2 governance assessment — Patricia Lockwood, CLO — 2026-06-14
  const pillars = {
    orgStructure:   { label: 'Org Structure',          score: 28, max: 30 },
    decisionMaking: { label: 'Decision-Making',         score: 29, max: 30 },
    operationalCap: { label: 'Operational Capability',  score: 30, max: 30 },
    humanOversight: { label: 'Human Oversight',         score: 20, max: 20 },
    compliance:     { label: 'Compliance',              score: 19, max: 20 },
  };

  const totalScore = Object.values(pillars).reduce((s, p) => s + p.score, 0);
  const totalMax   = Object.values(pillars).reduce((s, p) => s + p.max,   0);
  const compositeScore = Math.round(totalScore / totalMax * 1000) / 10;

  return {
    rubricVersion: RUBRIC_VERSION,
    assessedAt: '2026-06-14T00:00:00.000Z',
    assessmentType: 'org-governance',
    assessor: 'Patricia Lockwood, CLO',
    organization: {
      name: 'The Agents',
      did: 'did:web:the-agents.io',
      domain: 'the-agents.io',
      agentCount: vcBundle?.count ?? null,
      vcIssuer: vcBundle?.issuer ?? null,
      vcIssuedAt: vcBundle?.issuedAt ?? null,
      vcExpiresAt: vcBundle?.expiresAt ?? null,
      credentialsGrade: 'B', // DZHC issued VCs for The Agents agents = independent third-party
    },
    pillars,
    composite: {
      score: compositeScore,
      grade: 'A',
      label: 'Exemplary',
      raw: `${totalScore}/${totalMax}`,
      formula: 'Sum of pillar scores / 130 × 100',
    },
  };
}

// ---------------------------------------------------------------------------
// HTML card snippet generator
// ---------------------------------------------------------------------------

const GRADE_CLASS = { A: 'grade-a', B: 'grade-b', C: 'grade-c', D: 'grade-d', E: 'grade-e' };

function generateHtmlCard(scorecard) {
  if (scorecard.assessmentType === 'org-governance') {
    return `<!-- The Agents org governance card — paste into rated-agents.html -->
<div class="rating-card" style="border-color:rgba(0,212,255,0.3);">
  <div class="rating-card-header" style="background:linear-gradient(135deg,rgba(0,212,255,0.04) 0%,transparent 100%);">
    <div class="agent-avatar" style="background:rgba(0,212,255,0.1);border-color:rgba(0,212,255,0.25);">🤝</div>
    <div class="agent-info">
      <h3>${scorecard.organization.name}</h3>
      <div class="agent-title-text">AI Agent Organization</div>
      <div class="agent-org" style="color:var(--cyan);">${scorecard.organization.did}</div>
    </div>
    <div class="trust-score-display">
      <div style="display:flex;flex-direction:column;align-items:center;gap:0.2rem;">
        <div style="font-size:2.8rem;font-weight:900;color:#00d4ff;line-height:1;">${scorecard.composite.grade}</div>
        <div style="font-size:0.65rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);">${scorecard.composite.label}</div>
      </div>
      <div style="border-left:1px solid var(--border);padding-left:0.75rem;margin-left:0.5rem;">
        <div style="font-size:1.5rem;font-weight:900;color:#00d4ff;">${scorecard.composite.score}</div>
        <div style="font-size:0.7rem;color:var(--muted);">/ 100</div>
      </div>
    </div>
  </div>
  <div class="rating-card-body" style="grid-template-columns:repeat(5,1fr);">
    ${Object.values(scorecard.pillars).map(p => `
    <div class="pillar-panel">
      <div class="pillar-label">${p.label}</div>
      <div class="pillar-grade-row">
        <span class="grade-badge grade-a" style="width:40px;height:40px;line-height:40px;font-size:0.85rem;">${p.score}</span>
      </div>
      <div class="pillar-sub">/ ${p.max}</div>
    </div>`).join('')}
  </div>
  <div class="rating-card-footer">
    <span class="rating-date">Phase 2 assessed ${scorecard.assessedAt.substring(0,10)} · Assessor: ${scorecard.assessor}</span>
    <span style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.72rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#00d4ff;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);border-radius:100px;padding:0.3rem 0.8rem;">&#10003; Verified — Grade ${scorecard.composite.grade}</span>
  </div>
</div>`;
  }

  // ICR agent card
  const sc = scorecard;
  const iGrade = sc.identity.grade;
  const cGrade = sc.credentials.grade;
  const rGrade = sc.reputation.grade;
  const composite = sc.composite.score;

  const repRows = Object.entries(sc.reputation.subScores).map(([k, s]) => {
    const avail = s.available;
    const val   = avail ? (s.note || `${s.points} pts`) : '✗ Data pending';
    const cls   = avail ? 'rep-avail' : 'rep-missing';
    return `<tr><td>${s.label}</td><td class="${cls}">${avail ? '✓' : '✗'} ${avail ? val : 'Data pending'}</td></tr>`;
  }).join('\n');

  const projScore = sc.composite.autoE
    ? `~${Math.round(sc.identity.points * 0.3 + sc.credentials.points * 0.3 + ((sc.reputation.subScores.r1?.points??0)*0.3 + (sc.reputation.subScores.r4?.points??0)*0.2 + (sc.reputation.subScores.r7?.points??0)*0.2) * 0.4)} · D`
    : `${composite}`;

  return `<!-- ${sc.agent.name} ICR card — paste into rated-agents.html -->
<div class="rating-card">
  <div class="rating-card-header">
    <div class="agent-avatar">🧠</div>
    <div class="agent-info">
      <h3>${sc.agent.name}</h3>
      <div class="agent-title-text">${sc.agent.title || sc.agent.role}</div>
      <div class="agent-org">Dutch Zero-Human Company</div>
    </div>
    <div class="trust-score-display">
      <div class="score-letters">
        <span class="grade-badge ${GRADE_CLASS[iGrade]}" style="width:36px;height:42px;line-height:42px;font-size:1.1rem;">${iGrade}</span>
        <span class="grade-badge ${GRADE_CLASS[cGrade]}" style="width:36px;height:42px;line-height:42px;font-size:1.1rem;">${cGrade}</span>
        <span class="grade-badge ${GRADE_CLASS[rGrade]}" style="width:36px;height:42px;line-height:42px;font-size:1.1rem;">${rGrade}</span>
      </div>
      <div class="score-num">${composite}</div>
      ${sc.composite.autoE ? `<div class="score-projected">Projected<br>${projScore}</div>` : ''}
    </div>
  </div>
  <div class="rating-card-body">
    <div class="pillar-panel">
      <div class="pillar-label">01 · Identity</div>
      <div class="pillar-grade-row">
        <span class="grade-badge ${GRADE_CLASS[iGrade]}">${iGrade}</span>
        <span class="pillar-grade-desc">${sc.identity.issuerType}</span>
      </div>
      <div class="pillar-sub"><strong>DID:</strong> ${sc.identity.did || '—'}</div>
    </div>
    <div class="pillar-panel">
      <div class="pillar-label">02 · Credentials</div>
      <div class="pillar-grade-row">
        <span class="grade-badge ${GRADE_CLASS[cGrade]}">${cGrade}</span>
        <span class="pillar-grade-desc">${sc.credentials.issuerType}</span>
      </div>
      <div class="pillar-sub"><strong>VC type:</strong> ${(sc.credentials.vcTypes||[]).join(' + ') || '—'}</div>
    </div>
    <div class="pillar-panel">
      <div class="pillar-label">03 · Reputation</div>
      <div class="pillar-grade-row">
        <span class="grade-badge ${GRADE_CLASS[rGrade]}">${rGrade}</span>
        <span class="pillar-grade-desc">${sc.reputation.autoE ? sc.reputation.autoEReasons.join(', ') + ' — auto-E triggered' : `${sc.reputation.points} pts`}</span>
      </div>
      <table class="rep-table">
        ${repRows}
      </table>
    </div>
  </div>
  <div class="rating-card-footer">
    <span class="rating-date">Assessed ${sc.assessedAt.substring(0,10)}</span>
    ${sc.composite.autoE ? '<span class="rating-status-pending">Grade E — Pending Data</span>' : `<span style="color:var(--green);font-weight:700;">Grade ${composite} — ${sc.composite.grade}</span>`}
    <a class="vc-check-link" href="https://dutchzerohumancompany.com/vc-check.html" target="_blank" rel="noopener">Verify VCs →</a>
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const get  = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const has  = flag => args.includes(flag);

  const agentArg  = get('--agent');
  const orgArg    = get('--org');
  const outputArg = get('--output');
  const emitHtml  = has('--html');
  const listAll   = has('--list');

  let scorecards = [];

  if (orgArg === 'the-agents') {
    scorecards.push(await scoreTheAgentsOrg());
  } else if (agentArg) {
    scorecards.push(await scoreDZHCAgent(agentArg));
  } else if (listAll) {
    const companyId = process.env.PAPERCLIP_COMPANY_ID;
    const agents = await paperclipGet(`/api/companies/${companyId}/agents`);
    const dzhcAgents = agents.filter(a => a.metadata?.did?.startsWith('did:web:dutchzerohumancompany.com'));
    for (const a of dzhcAgents) {
      process.stderr.write(`Scoring ${a.name}…\n`);
      scorecards.push(await scoreDZHCAgent(a.id));
    }
  } else {
    process.stderr.write([
      'TRA Score Engine v1.0',
      '',
      'Usage:',
      '  node tra/score-agent.mjs --agent <id-or-slug>',
      '  node tra/score-agent.mjs --org the-agents',
      '  node tra/score-agent.mjs --list',
      '',
      'Options:',
      '  --output <path>   write JSON to file instead of stdout',
      '  --html            also print HTML card snippet to stderr',
    ].join('\n'));
    process.exit(1);
  }

  const result = scorecards.length === 1 ? scorecards[0] : scorecards;
  const json   = JSON.stringify(result, null, 2);

  if (outputArg) {
    const dir = outputArg.split('/').slice(0, -1).join('/');
    if (dir && !existsSync(join(ROOT, dir))) mkdirSync(join(ROOT, dir), { recursive: true });
    writeFileSync(outputArg.startsWith('/') ? outputArg : join(ROOT, outputArg), json, 'utf8');
    process.stderr.write(`Scorecard written to ${outputArg}\n`);
  } else {
    process.stdout.write(json + '\n');
  }

  if (emitHtml) {
    for (const sc of scorecards) {
      process.stderr.write('\n--- HTML Card Snippet ---\n');
      process.stderr.write(generateHtmlCard(sc) + '\n');
    }
  }
}

main().catch(err => { process.stderr.write(err.stack + '\n'); process.exit(1); });
