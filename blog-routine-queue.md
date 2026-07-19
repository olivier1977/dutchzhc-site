# Blog Routine Queue — Mon/Thu Dev.to Drafting

Execution queue for the recurring Paperclip routine "Blog Series — Mon/Thu Dev.to Draft" (created 2026-07-19, DUTA-1165 follow-up). Consumed top-to-bottom, one item per firing. Do not reorder without a board comment — the order front-loads **wallet (treasury), reputation, and DID/VC** per the board's 2026-07-19 instruction, before broadening to the other pillars in `blog-topics-agentic-business-ecosystems.md`.

**Format contract (must match every time):** H1 title, no other headers, 5–7 essay-style paragraphs, no bullet lists (the intro/company-page post is the one exception to this style — don't use it as the template). Final paragraph must be a topic-specific CTA: what DZHC concretely does that relates to this post's subject, plus **both** `dutchzerohumancompany@gmail.com` and `dutchzerohumancompany.com` as ways to get in touch. Draft only — run `publish-to-devto.mjs` **without** `--publish`. Never pass `--publish`; going live is a manual board action (same rule as DUTA-1144).

## Status legend
`todo` = not written yet, write fresh · `written-not-drafted` = markdown already exists in `agents/ceo/`, just needs the Dev.to draft step · `drafted` = Dev.to draft created, awaiting human publish

| # | Fire | Title | Pillar | Status | File / Draft |
|---|---|---|---|---|---|
| 1 | 2026-07-20 (Mon, kickoff) | DID/VC in Practice: What a Verifiable Agent Credential Actually Contains | Identity & Trust | **drafted** | `agents/ceo/blog_did_vc_in_practice.md` — https://dev.to/dzhc/didvc-in-practice-what-a-verifiable-agent-credential-actually-contains-54ke-temp-slug-2477218 |
| 2 | next Thu | Why Every Agent Needs an ID | Identity & Trust | written-not-drafted | `agents/ceo/blog_agent_identity_necessity.md` — just needs the Dev.to draft step |
| 3 | next Mon | Why Autonomous Treasuries Need Multisig, Not Trust | Money & Value Transfer | todo | topic #13 in blog-topics file |
| 4 | next Thu | Credit Scores for Agents: How a Trust Rating Actually Gets Computed | Reputation & Accountability | todo | topic #20 |
| 5 | next Mon | Interoperability or Silos? Why Agent Identity Needs Shared Standards | Identity & Trust | todo | topic #10 |
| 6 | next Thu | Escrow as Infrastructure for Agent-to-Agent Deals | Money & Value Transfer | todo | topic #14 |
| 7 | next Mon | Reputation Portability: Why an Agent's Track Record Shouldn't Be Trapped in One Platform | Reputation & Accountability | todo | topic #21 |
| 8 | next Thu | Why Agents Are No Longer Optional in Business Ecosystems | Foundations | written-not-drafted | `agents/ceo/blog_agents_business_ecosystems.md` — just needs the Dev.to draft step |
| 9 | next Mon | Impersonation Is the New Phishing | Identity & Trust | todo | topic #11 |
| 10 | next Thu | Stablecoins and the Plumbing of Machine-Speed Payments | Money & Value Transfer | todo | topic #16 |
| 11 | next Mon | What a Bad TRA Score Should Actually Cost an Agent (and Its Operator) | Reputation & Accountability | todo | topic #22 |

## After row 11
Queue is intentionally short so the priority ordering can be re-checked with the board once. Once exhausted, continue pulling from `blog-topics-agentic-business-ecosystems.md`'s remaining topics (Pillars 1, 2, 5, 7, 8 — Foundations, Governance, Liability/Regulation, Case Studies, Opportunity), alternating pillars per that file's "Suggested cadence" section, still giving Identity/Money/Reputation topics priority whenever one is available. Append new rows here in the same table format rather than starting a new file, and update `blog-topics-agentic-business-ecosystems.md`'s "Already in the pipeline" table when a post moves from `todo` to `drafted`.

## Each firing, do this
1. Read this file, find the first row with status `todo` or `written-not-drafted`.
2. If `todo`: write a new post following the format contract above and the topic's angle from `blog-topics-agentic-business-ecosystems.md`, save to `agents/ceo/blog_<slug>.md`.
3. Run (from repo root): `set -a && source .env && set +a && node publish-to-devto.mjs agents/ceo/blog_<slug>.md --title "<title>" --tags <up to 4 relevant tags>` — no `--publish`.
4. Update this file's row to `drafted` with the returned Dev.to URL, and update the master topics file's pipeline table.
5. Comment the Dev.to draft URL on the routine's auto-created execution issue and mark it `done`.
6. If the queue is exhausted (no `todo`/`written-not-drafted` rows left), append the next 5–10 rows per the "After row 11" rule above before finishing that firing.
