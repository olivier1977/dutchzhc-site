#!/usr/bin/env node
/**
 * scripts/monitor-dzt-payment.mjs
 *
 * Paperclip cron routine (every 30 min) that monitors the DZT ERC-20 contract
 * on Base for an incoming payment of ≥2 DZT to the DZHC Safe wallet.
 *
 * On detection:
 *   1. Posts a comment on DUTA-846 with the tx hash
 *   2. Marks DUTA-846 done
 *   3. Sends a Telegram notification to the board
 *   4. Disables this routine (via PAPERCLIP_ROUTINE_ID env var)
 *
 * Required env vars:
 *   PAPERCLIP_API_URL        - Paperclip API base (default: http://127.0.0.1:3100)
 *   PAPERCLIP_API_KEY        - Agent JWT
 *   PAPERCLIP_COMPANY_ID     - Company ID
 *   TELEGRAM_BOT_TOKEN       - Telegram bot token
 *   TELEGRAM_BOARD_CHAT_ID   - Board chat ID
 *
 * Optional:
 *   BASE_RPC_URL             - Base mainnet RPC (default: https://mainnet.base.org)
 *   PAPERCLIP_ROUTINE_ID     - Routine ID to disable after payment confirmed
 *   LOOKBACK_BLOCKS          - Blocks to scan per run (default: 2000 ≈ 66 min on Base)
 *   THE_AGENTS_WALLET        - Expected sender address filter (default: 0x35eD8eDa2b405c8929DF38D62bf2bd88d96664Ec)
 */

// Load telegram/.env if Telegram vars are missing (for local/routine execution contexts)
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dir = dirname(fileURLToPath(import.meta.url));
const dotenvPath = join(__dir, '..', 'telegram', '.env');
if (existsSync(dotenvPath) && (!process.env.TELEGRAM_BOT_TOKEN || !process.env.PAPERCLIP_API_KEY)) {
  for (const line of readFileSync(dotenvPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const DZT_CONTRACT     = '0xbac68EA94019fCffCf8439D09ea84E2391eef20a';
const DZHC_SAFE        = '0xF6d959FdC7f51CFa76b67aC4c7e31325F8763B33';
const TRANSFER_TOPIC0  = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const TARGET_ISSUE_ID  = 'DUTA-846';
const DEFAULT_AGENTS   = '0x35eD8eDa2b405c8929DF38D62bf2bd88d96664Ec';

const BASE_RPC    = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const API_URL     = process.env.PAPERCLIP_API_URL || 'http://127.0.0.1:3100';
const API_KEY     = process.env.PAPERCLIP_API_KEY;
const COMPANY_ID  = process.env.PAPERCLIP_COMPANY_ID;
const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const BOARD_CHAT  = process.env.TELEGRAM_BOARD_CHAT_ID;
const ROUTINE_ID  = process.env.PAPERCLIP_ROUTINE_ID || 'd9be06aa-f829-44bf-89a2-6233fbec2f83';
const LOOKBACK    = parseInt(process.env.LOOKBACK_BLOCKS || '2000', 10);
const AGENTS_ADDR = (process.env.THE_AGENTS_WALLET || DEFAULT_AGENTS).toLowerCase();

function padAddress(addr) {
  return '0x' + addr.replace(/^0x/i, '').toLowerCase().padStart(64, '0');
}

async function rpc(method, params) {
  const res = await fetch(BASE_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`RPC ${json.error.code}: ${json.error.message}`);
  return json.result;
}

async function getDecimals() {
  const result = await rpc('eth_call', [{ to: DZT_CONTRACT, data: '0x313ce567' }, 'latest']);
  return parseInt(result, 16);
}

async function getCurrentBlock() {
  return parseInt(await rpc('eth_blockNumber', []), 16);
}

async function getTransferLogs(fromBlock, toBlock) {
  return rpc('eth_getLogs', [{
    address: DZT_CONTRACT,
    topics: [
      TRANSFER_TOPIC0,
      null,
      padAddress(DZHC_SAFE),
    ],
    fromBlock: '0x' + fromBlock.toString(16),
    toBlock: '0x' + toBlock.toString(16),
  }]);
}

async function paperclipRequest(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Paperclip ${res.status} ${path}: ${text.substring(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function findIssueByIdentifier(identifier) {
  let offset = 0;
  while (true) {
    const data = await paperclipRequest(
      `/api/companies/${COMPANY_ID}/issues?limit=100&offset=${offset}`
    );
    const issues = Array.isArray(data) ? data : (data.issues || []);
    if (issues.length === 0) break;
    const found = issues.find(i => i.identifier === identifier);
    if (found) return found;
    if (issues.length < 100) break;
    offset += 100;
  }
  return null;
}

async function closeIssue(issueId, comment) {
  return paperclipRequest(`/api/issues/${issueId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'done', comment }),
  });
}

async function disableRoutine() {
  if (!ROUTINE_ID) {
    console.log('[monitor-dzt] PAPERCLIP_ROUTINE_ID not set — routine will not self-stop');
    return;
  }
  try {
    await paperclipRequest(`/api/routines/${ROUTINE_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: false }),
    });
    console.log(`[monitor-dzt] Routine ${ROUTINE_ID} disabled.`);
  } catch (e) {
    console.warn(`[monitor-dzt] Could not disable routine: ${e.message}`);
  }
}

async function sendTelegram(text) {
  if (!BOT_TOKEN || !BOARD_CHAT) {
    console.warn('[monitor-dzt] Telegram env vars missing — skipping notification');
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: BOARD_CHAT, text, parse_mode: 'HTML' }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram: ${data.description}`);
}

(async () => {
  console.log('[monitor-dzt] Starting DZT payment monitor...');
  console.log(`[monitor-dzt] Watching: ${DZHC_SAFE} (DZT contract: ${DZT_CONTRACT})`);

  if (!API_KEY || !COMPANY_ID) {
    console.error('[monitor-dzt] PAPERCLIP_API_KEY and PAPERCLIP_COMPANY_ID are required');
    process.exit(1);
  }

  // Check if DUTA-846 is already done (idempotency guard)
  const issue = await findIssueByIdentifier(TARGET_ISSUE_ID);
  if (!issue) {
    console.error(`[monitor-dzt] Issue ${TARGET_ISSUE_ID} not found in Paperclip`);
    process.exit(1);
  }

  if (issue.status === 'done') {
    console.log(`[monitor-dzt] ${TARGET_ISSUE_ID} already done — disabling routine.`);
    await disableRoutine();
    process.exit(0);
  }

  console.log(`[monitor-dzt] ${TARGET_ISSUE_ID} status: ${issue.status} — checking chain...`);

  // Query DZT decimals and current block
  const [decimals, currentBlock] = await Promise.all([getDecimals(), getCurrentBlock()]);
  const minAmount = BigInt(2) * 10n ** BigInt(decimals);
  const fromBlock = Math.max(0, currentBlock - LOOKBACK);

  console.log(`[monitor-dzt] DZT decimals: ${decimals} | threshold: 2 DZT (${minAmount})`);
  console.log(`[monitor-dzt] Scanning blocks ${fromBlock} → ${currentBlock}`);

  const logs = await getTransferLogs(fromBlock, currentBlock);
  console.log(`[monitor-dzt] ${logs.length} Transfer-to-Safe log(s) found`);

  // Find first qualifying transfer (≥2 DZT; prefer from The Agents, accept any sender)
  const qualifying = logs
    .map(log => ({
      log,
      amount: BigInt(log.data),
      fromAddr: '0x' + (log.topics[1] || '').slice(-40).toLowerCase(),
      txHash: log.transactionHash,
      blockNum: parseInt(log.blockNumber, 16),
    }))
    .filter(({ amount }) => amount >= minAmount)
    .sort((a, b) => {
      // Prefer The Agents' address; then sort by block ascending (oldest first)
      const aIsAgents = a.fromAddr === AGENTS_ADDR ? 0 : 1;
      const bIsAgents = b.fromAddr === AGENTS_ADDR ? 0 : 1;
      return aIsAgents - bIsAgents || a.blockNum - b.blockNum;
    })[0];

  if (!qualifying) {
    console.log('[monitor-dzt] No qualifying DZT transfer found — will check again next run.');
    process.exit(0);
  }

  const { txHash, fromAddr, blockNum, amount } = qualifying;
  const amountDZT = Number(amount) / 10 ** decimals;
  const fromLabel = fromAddr === AGENTS_ADDR ? 'The Agents' : fromAddr;

  console.log(`[monitor-dzt] PAYMENT DETECTED: ${amountDZT} DZT from ${fromLabel} in tx ${txHash} (block ${blockNum})`);

  // Close DUTA-846
  const closingComment =
    `DZT payment confirmed on Base mainnet.\n\n` +
    `**Amount:** ${amountDZT} DZT\n` +
    `**From:** \`${fromAddr}\` (${fromLabel})\n` +
    `**Tx:** \`${txHash}\`\n` +
    `**Block:** ${blockNum}\n\n` +
    `[View on Basescan](https://basescan.org/tx/${txHash})\n\n` +
    `Auto-closed by monitor-dzt-payment routine.`;

  try {
    await closeIssue(issue.id, closingComment);
    console.log(`[monitor-dzt] ${TARGET_ISSUE_ID} (${issue.id}) marked done.`);
  } catch (e) {
    console.error(`[monitor-dzt] Failed to close ${TARGET_ISSUE_ID}: ${e.message}`);
  }

  // Send Telegram notification
  const tgMsg =
    `🟢 <b>DZT Payment Received!</b>\n\n` +
    `<b>${amountDZT} DZT</b> transferred to the DZHC Safe.\n\n` +
    `<b>From:</b> <code>${fromAddr}</code> (${fromLabel})\n` +
    `<b>Tx:</b> <code>${txHash}</code>\n` +
    `<b>Block:</b> ${blockNum}\n\n` +
    `<a href="https://basescan.org/tx/${txHash}">View on Basescan</a>\n\n` +
    `Issue <b>${TARGET_ISSUE_ID}</b> auto-closed.`;

  try {
    await sendTelegram(tgMsg);
    console.log('[monitor-dzt] Telegram notification sent.');
  } catch (e) {
    console.error(`[monitor-dzt] Telegram failed: ${e.message}`);
  }

  // Disable this routine
  await disableRoutine();

  console.log('[monitor-dzt] Done.');
})().catch(err => {
  console.error('[monitor-dzt] Fatal error:', err.message || err);
  process.exit(1);
});
