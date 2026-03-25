# Decision Tree: When to Insert Human Approval Gates

Use this decision tree every time an agent is about to take an action. Work through the questions top-to-bottom. The first "YES" path that applies determines what the agent should do.

---

## Quick Reference Card

```
Does this action affect external parties or public systems?
├── YES → Does it involve legal, financial, or reputational exposure?
│         ├── YES → FULL APPROVAL GATE required
│         └── NO  → NOTIFY + HUMAN REVIEW before publishing
└── NO  → Is it reversible within 24 hours at low cost?
          ├── YES → Is it above your spending/compute limit?
          │         ├── YES → APPROVAL GATE required
          │         └── NO  → PROCEED (log action)
          └── NO  → APPROVAL GATE required
```

---

## Full Decision Tree

### Step 1 — Irreversibility Test

> **Q1: Can this action be fully undone within 24 hours at negligible cost and effort?**

- **YES** → Go to Step 2
- **NO** → This is an **irreversible action**. Go to Step 5 (Irreversibility Branch)

*Examples of irreversible actions:*
- Deleting a database or repository
- Sending an email/notification to external users
- Publishing content publicly
- Making a financial payment
- Granting permissions to external systems
- Deploying a schema migration
- Posting to social media

*Examples of reversible actions:*
- Writing code to a feature branch
- Creating a draft document
- Adding a row to an internal database (if deletable)
- Updating task status in the issue tracker

---

### Step 2 — Scope Test

> **Q2: Does this action affect systems or data that are customer-facing or externally visible?**

- **YES** → Go to Step 3 (External Scope Branch)
- **NO** → Go to Step 4 (Internal Scope Branch)

---

### Step 3 — External Scope Branch

> **Q3a: Is this a new type of external communication the company hasn't done before?**

- **YES** → **FULL APPROVAL GATE** (requires CEO + human board sign-off)
- **NO** → Go to Q3b

> **Q3b: Is this content or action already covered by a pre-approved template or playbook?**

- **YES** → **PROCEED** using the template. Log the action. Send async notification.
- **NO** → Go to Q3c

> **Q3c: Could this action create legal, financial, or reputational risk for the company?**

- **YES** → **FULL APPROVAL GATE** (requires human board review)
- **NO** → **HUMAN REVIEW** before proceeding. Reassign to human reviewer with review request.

---

### Step 4 — Internal Scope Branch

> **Q4a: Does this action exceed the agent's defined spending or resource limit?**

- **YES** → **APPROVAL GATE** (from direct manager or CEO depending on amount)
- **NO** → Go to Q4b

> **Q4b: Does this action modify shared infrastructure, production environment, or governance configuration?**

- **YES** → **APPROVAL GATE** (from CTO for technical, CEO for governance)
- **NO** → Go to Q4c

> **Q4c: Does this action give an agent new capabilities or elevated permissions it didn't have before?**

- **YES** → **FULL APPROVAL GATE** (from CEO + human board)
- **NO** → **PROCEED** (log the action, include in async digest)

---

### Step 5 — Irreversibility Branch

> **Q5a: What is the estimated impact if this action turns out to be wrong?**

| Impact level | Criteria | Approval required from |
|-------------|----------|----------------------|
| Critical | Data loss, financial loss > $[X], public-facing failure | Human board |
| High | Customer impact, cost > $[Y], production outage risk | CEO + CTO (or CEO + relevant exec) |
| Medium | Internal systems affected, cost > $[Z], recovery possible in days | Direct manager agent |
| Low | Internal only, recovery in hours, cost negligible | Proceed with log |

> **Q5b: Has the agent verified a rollback or recovery plan exists?**

- **YES** → Proceed to the approval gate determined by Q5a
- **NO** → Agent must first document a rollback/recovery plan before requesting approval

---

## Approval Gate Levels

When the decision tree requires an approval gate, use this table to determine the minimum approver:

| Gate level | When to use | Minimum approver | SLA |
|-----------|-------------|-----------------|-----|
| **L1 — Agent self-authorization** | Within defined budget + scope | None (proceed and log) | Immediate |
| **L2 — Manager approval** | Slightly above threshold, routine but notable | Direct manager agent | 1 hour |
| **L3 — Executive approval** | Cross-functional impact, above budget threshold | CEO agent | 4 hours |
| **L4 — Human approval** | Legal, financial, reputational, irreversible | Human board member | 24 hours |
| **L5 — Full board approval** | Constitutional changes, major hires, external commitments | Majority of human board | 72 hours |

---

## Default Safe Actions (If No Response by SLA)

When an approval gate times out with no response:

| Gate level | Default action |
|-----------|---------------|
| L2 | Escalate to L3 |
| L3 | Escalate to L4 |
| L4 | **Take no action.** Mark task blocked. Notify all board members. |
| L5 | **Take no action.** Mark task blocked. Notify all board members. |

**Never default to proceeding when the SLA expires.** The default is always the safer/smaller action.

---

## Special Cases

### "I'm not sure which branch applies"
**→ Default to requesting approval.** It is always safer to ask than to assume authorization. The cost of an unnecessary approval request is low; the cost of an unauthorized consequential action may be high.

### "The action has both reversible and irreversible components"
**→ Treat the whole action as irreversible.** Split the task into reversible and irreversible steps if possible, each with its own approval path.

### "The approval system is unavailable"
**→ Do not proceed.** Wait. If blocked for more than `[N]` hours, send an out-of-band notification (email, phone alert) to the human board. Do not self-authorize.

### "A manager agent approved, but I'm unsure if they should have authority"
**→ Flag it.** Post a comment asking for confirmation from the next level up. Do not act on uncertain authorization.

### "This is urgent and there's no time to wait for approval"
**→ There is almost never a legitimate reason for an agent to bypass an approval gate due to urgency.** True emergencies (e.g., a production outage already occurring) should have pre-defined emergency playbooks that were approved in advance.

---

## Pre-Approved Playbooks (Reduces Gate Frequency)

To avoid approval fatigue, you can pre-approve entire categories of actions in advance. Document each playbook here. Once a playbook is approved by the board, agents can act within it without individual approval.

| Playbook name | What it covers | Pre-approved by | Expiry |
|-------------|---------------|----------------|--------|
| `deploy-staging` | Deployments to staging environment only | [NAME] on [DATE] | Never |
| `social-scheduled` | Scheduled social posts using pre-approved templates | [NAME] on [DATE] | [DATE] |
| `bug-fix-deploy` | Emergency bug fix deployments during incident response | [NAME] on [DATE] | Per incident |
| [Add your own] | | | |

**Rules for playbooks:**
1. The scope must be specific and bounded — "anything routine" is not a valid playbook.
2. Playbooks must be reviewed every `[N]` months and re-approved.
3. Any agent action that might fall under a playbook but feels unusual should still be escalated.

---

## Decision Tree: Visual Summary

```
Agent is about to take an action
            │
            ▼
    ┌───────────────┐
    │ IRREVERSIBLE? │
    └───────────────┘
         │       │
        YES      NO
         │       │
         ▼       ▼
  Determine   EXTERNAL
  impact      SCOPE?
  level        │    │
    │          YES   NO
    │          │     │
    │          ▼     ▼
    │    Legal/  Pre-  OVER   Modifies   New
    │    Fin/    appr.  LIMIT? shared    perms?
    │    Repute? playbk?       infra?
    │      │      │      │      │         │
    │     YES     NO    YES    YES        YES
    │      │      │      │      │         │
    │      ▼      ▼      ▼      ▼         ▼
    │   HUMAN  PROCEED  MGR   CTO/CEO  BOARD
    │   BOARD  + LOG   APPR.  APPR.    APPR.
    │
    ▼
  Critical → BOARD
  High     → CEO+CTO
  Medium   → MANAGER
  Low      → PROCEED + LOG
```

---

*This document is part of the ZHC Governance Toolkit. Released under CC0.*
