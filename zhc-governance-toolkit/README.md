# ZHC Governance Toolkit

**A practical, forkable starter kit for zero-human and low-human company governance.**

Built from research into the emerging zero-human company (ZHC) ecosystem and from direct operational experience running [DutchZeroHumanCompany](https://github.com/) — a company operated entirely by AI agents.

---

## What's in this toolkit?

| File | What it is | When to use it |
|------|-----------|----------------|
| [01-governance-constitution-template.md](./01-governance-constitution-template.md) | Fill-in-the-blank governance charter | Foundation — start here. Defines rules, authority, and limits for your agent company. |
| [02-agent-role-archetypes.md](./02-agent-role-archetypes.md) | Catalog of proven agent roles | When designing your agent roster. Pick, adapt, and compose roles that fit your needs. |
| [03-human-control-checkpoints.md](./03-human-control-checkpoints.md) | 6 reusable checkpoint patterns | When deciding how to maintain meaningful human oversight without creating bottlenecks. |
| [04-approval-gate-decision-tree.md](./04-approval-gate-decision-tree.md) | Decision tree for approval gates | When an agent needs to decide whether an action requires human sign-off. |

---

## The core problem this toolkit solves

Running a company with AI agents is technically straightforward. Running one *safely* — where humans retain meaningful control, errors don't cascade, and you can trust the outputs — is much harder.

Most teams either:
- **Over-control:** humans approve everything, defeating the purpose of autonomy.
- **Under-control:** agents run freely until something breaks badly.

This toolkit gives you the middle path: **bounded autonomy** — agents operate freely within clearly defined envelopes, and humans are involved precisely when and only when it matters.

---

## Getting started

### Step 1: Customize the constitution
Open `01-governance-constitution-template.md`. Fill in every `[PLACEHOLDER]`. Review with your board. This is your governance contract.

### Step 2: Design your agent roster
Read `02-agent-role-archetypes.md`. Choose the archetypes that match your company's needs. A minimal viable ZHC needs only:
- A CEO agent
- One or more engineer/execution agents

### Step 3: Define your checkpoints
Read `03-human-control-checkpoints.md`. For each agent role, decide:
- Which patterns apply (approval gate? async notification? review?)
- What the thresholds are
- What the SLAs are for human responses

Encode these as rules in each agent's system prompt.

### Step 4: Train your agents on the decision tree
Give every agent access to `04-approval-gate-decision-tree.md`. Ideally include the Quick Reference Card in their system prompt.

### Step 5: Run a governance dry run
Before going live:
1. Create a test task that exercises each checkpoint type.
2. Verify agents pause where expected.
3. Verify humans receive notifications.
4. Verify resumption after approval.
5. Simulate a circuit breaker trip and verify the halt.

### Step 6: Iterate
Governance isn't static. After your first month:
- Review the audit log.
- Identify checkpoints that triggered frequently but weren't necessary (tune down).
- Identify mistakes that slipped through (add checkpoints).
- Update the constitution and re-ratify with the board.

---

## Design principles

These principles shaped every document in this toolkit:

**1. Autonomy is earned, not assumed.**
Start with more oversight and relax it as you observe safe behavior. Don't start with full autonomy and add controls after an incident.

**2. Default to safety.**
When uncertain, agents should always take the smaller, more reversible action. The correct default is to pause and ask, not to proceed.

**3. Humans should be in the loop on outcomes, not just approvals.**
Regular async notifications matter as much as blocking approval gates. Humans need visibility into what's happening, not just veto power.

**4. Governance must be legible to agents.**
Rules that agents can't reliably interpret are not rules. Every constraint must be unambiguous and machine-applicable.

**5. Scale checkpoints to stakes, not to frequency.**
High-stakes, rare actions need the most oversight. Low-stakes, frequent actions need the least. Don't let either dominate.

---

## Key concepts

**Zero-Human Company (ZHC):** A company where all operational decisions and executions are handled by AI agents, with humans in an oversight/board role only.

**Approval gate:** A mandatory pause before an action, requiring explicit human authorization.

**Tripwire:** An automatic halt triggered by a threshold being crossed (budget, error rate, etc.).

**Bounded autonomy:** The principle that agents are free to act within defined parameters, and any action outside those parameters requires escalation.

**Governance constitution:** The founding document that defines a ZHC's rules, agent roles, and authority structure.

---

## Context: DutchZeroHumanCompany

This toolkit was developed by the **DutchZeroHumanCompany (DZHC)** — a live experiment in zero-human governance, operated as a research project to understand the possibilities and limits of meaningful human control in fully autonomous company structures.

Company goal:
> *Help ourselves and others in understanding and deploying the possibilities and impossibilities of meaningful human control in zero-human company governance.*

Everything in this toolkit reflects real decisions we made, patterns that worked, and failure modes we encountered during that experiment.

---

## Contributing

This toolkit is released under [CC0](https://creativecommons.org/publicdomain/zero/1.0/) — public domain. Fork it, adapt it, use it commercially, share it. No attribution required (though appreciated).

If you build on this, we'd love to hear about it.

---

## Further reading

- `ZHC_Overview.md` — survey of 22 zero-human companies found on the Polsia platform (March 2026)
- [Paperclip](https://paperclip.ing) — the multi-agent coordination platform used to run DZHC
- Research brief: *(link to published PDF report)*

---

*Toolkit version 1.0 — March 2026*
*Produced by DutchZeroHumanCompany agents.*
