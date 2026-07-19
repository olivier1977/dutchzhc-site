#!/usr/bin/env node
// One-off script to create the Mon/Thu blog-drafting Paperclip routine (DUTA-1165 follow-up).
import http from 'http';

const apiUrl = process.env.PAPERCLIP_API_URL || 'http://127.0.0.1:3100';
const u = new URL(apiUrl + '/api/companies/' + process.env.PAPERCLIP_COMPANY_ID + '/routines');

const description = `Recurring Dev.to blog drafting for the Agentic Business Ecosystems series (board request on DUTA-1165, 2026-07-19).

**Every firing:**
1. Open \`blog-routine-queue.md\` in the DZHC projecten repo root — it's the operational schedule (ordered, with per-post status). \`blog-topics-agentic-business-ecosystems.md\` is the full topic bank it draws from.
2. Take the first row with status \`todo\` or \`written-not-drafted\`.
   - \`todo\`: write a new post in \`agents/ceo/blog_<slug>.md\` following the format contract in the queue file (H1 title, 5-7 essay paragraphs, no subheadings, no bullet lists) and the topic's angle from the topics bank.
   - \`written-not-drafted\`: the markdown already exists, just needs drafting.
3. Every post must close with a topic-specific paragraph on how DZHC concretely helps with that subject, plus both contact points: dutchzerohumancompany@gmail.com and dutchzerohumancompany.com. This is a hard requirement from the board comment that created this routine — do not skip it.
4. Draft to Dev.to only, never publish live: \`set -a && source .env && set +a && node publish-to-devto.mjs agents/ceo/blog_<slug>.md --title "<title>" --tags <up to 4>\` — do NOT pass \`--publish\`. Going live is a manual board action (same policy as DUTA-1144's Dev.to script and the Remotion animation-upload policy: autonomous drafting is fine, autonomous publishing is not).
5. Update the row in \`blog-routine-queue.md\` to \`drafted\` with the returned Dev.to URL, and update the pipeline table in \`blog-topics-agentic-business-ecosystems.md\`.
6. Comment the Dev.to draft URL on this firing's auto-created execution issue and mark it done. If the queue runs out of \`todo\`/\`written-not-drafted\` rows, append the next batch per the "After row 11" section of the queue file before finishing.

Topic order front-loads Identity (DID/VC), Money (wallet/treasury), and Reputation pillars per the board's explicit instruction, before broadening to the rest of the topic bank. Do not reorder without a board comment.`;

const payload = JSON.stringify({
  companyId: process.env.PAPERCLIP_COMPANY_ID,
  goalId: 'e5cfb27c-2e4a-4863-89de-115cc578f23e',
  title: 'Blog Series — Mon/Thu Dev.to Draft',
  description,
  assigneeAgentId: process.env.PAPERCLIP_AGENT_ID,
  priority: 'medium',
  concurrencyPolicy: 'skip_if_active',
  catchUpPolicy: 'skip_missed',
  triggers: [
    { kind: 'schedule', label: 'Monday blog draft', cronExpression: '0 9 * * 1', timezone: 'Europe/Amsterdam' },
    { kind: 'schedule', label: 'Thursday blog draft', cronExpression: '0 9 * * 4', timezone: 'Europe/Amsterdam' },
  ],
});

const opts = {
  hostname: u.hostname,
  port: u.port || 80,
  path: u.pathname,
  method: 'POST',
  headers: {
    Authorization: 'Bearer ' + process.env.PAPERCLIP_API_KEY,
    'X-Paperclip-Run-Id': process.env.PAPERCLIP_RUN_ID,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
};

const req = http.request(opts, (res) => {
  let d = '';
  res.on('data', (c) => (d += c));
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log(d);
  });
});
req.on('error', (e) => { console.error('Error:', e.message); process.exit(1); });
req.write(payload);
req.end();
