# Human Control Checkpoint Patterns

This document describes reusable patterns for inserting human oversight into autonomous AI company operations. Each pattern is a named, composable building block — combine them to match your governance requirements.

---

## Why Checkpoints Matter

Fully autonomous agents operating without any human checkpoints create several risks:

1. **Error compounding** — one bad decision triggers a cascade of downstream bad decisions before anyone notices.
2. **Scope creep** — agents gradually expand their own authority in ways the original design didn't intend.
3. **Irreversibility** — some actions (publishing, spending, deleting, communicating externally) cannot be easily undone.
4. **Accountability gaps** — when something goes wrong, it's unclear who is responsible.

Checkpoints don't eliminate autonomy — they bound it. The goal is maximum useful autonomy within well-defined safety envelopes.

---

## Pattern 1: Approval Gate

**Type:** Blocking
**Trigger:** Before a defined high-stakes action
**Human effort:** Low (approve/deny decision)

### Description
An agent pauses before executing an action and submits a request for explicit human approval. The action does not proceed until a human approves. If no response arrives within the defined SLA, the agent escalates or takes the default-safe action.

### When to use
- Any action with external visibility (publishing, emailing, deploying)
- Any financial transaction above a threshold
- Any change affecting production infrastructure
- Any new agent hire or role expansion

### Implementation pattern
```
1. Agent identifies action as "approval-required" based on its rule set
2. Agent creates an approval request with:
   - What action is being requested
   - Why it's needed (linked task/goal)
   - What happens if denied
   - Proposed timeline
3. Agent sets its task status to "blocked" and waits
4. Human reviews and approves/denies
5. If approved: agent proceeds, logs approval reference
6. If denied: agent posts acknowledgment, escalates or closes task
7. If no response within SLA: agent escalates to next level
```

### Example approval request format
```markdown
## Approval Required: Production Deployment

**Requesting agent:** CTO Agent
**Action:** Deploy v1.3.2 to production
**Reason:** Fixes critical auth bug (DUT-45)
**Impact if denied:** Bug remains for users; workaround exists
**Deadline:** Within 4 hours to meet SLA

**Review checklist:**
- [x] All tests passing
- [x] Staging deployment successful
- [x] Rollback plan documented
- [ ] **Human approval required**
```

### Failure modes
| Risk | Mitigation |
|------|-----------|
| Approval fatigue (too many requests) | Only require approval for genuinely high-stakes actions; tune thresholds |
| SLA expiry with no response | Default-safe action (do nothing) + escalation to next human |
| Approval granted without review | Audit trail; periodic review of approval patterns |

---

## Pattern 2: Async Notification

**Type:** Non-blocking
**Trigger:** After a defined action, or on a schedule
**Human effort:** Very low (read-only, no action required unless problem spotted)

### Description
Agents send regular updates to humans so the board stays informed without being a bottleneck. Humans can intervene if they spot something wrong, but work continues without waiting.

### When to use
- Routine task completions
- Budget status updates
- Weekly/monthly summaries
- Non-critical deployments
- Completed research or reports

### Implementation pattern
```
1. Agent completes action
2. Agent automatically posts update to defined channel (email, issue comment, Slack, etc.)
3. Update includes: what was done, current status, any anomalies
4. Humans read on their own schedule
5. If a human wants to reverse an action, they issue an override
```

### Recommended notification schedule

| Notification | Frequency | Sender | Content |
|-------------|-----------|--------|---------|
| Task completion digest | Daily | CEO Agent | All tasks completed in last 24h |
| Budget status | Weekly | Finance/CEO Agent | Spend vs. budget by agent |
| Goal progress | Weekly | CEO Agent | % complete per active goal |
| Anomaly alerts | Immediate | Any agent | Unexpected failures, cost spikes, errors |
| Full company report | Monthly | CEO Agent | Summary of all activity, decisions, and outcomes |

### Example notification format
```markdown
## Weekly Digest — Week of [DATE]

**Tasks completed:** 12
**Tasks in progress:** 4
**Tasks blocked:** 1 (awaiting your input on [DUT-67])

**Budget status:** 43% of monthly limit used ($430/$1,000)

**Notable actions:**
- Deployed v1.3.2 (auth bug fix) — no issues
- Published 3 blog posts (all pre-approved)
- Added dependency: `stripe@14.2.0` (CTO approved)

**Requires your attention:**
- [DUT-67](/PREFIX/issues/DUT-67) — legal question about GDPR compliance
```

---

## Pattern 3: Human-in-the-Loop Review

**Type:** Blocking review (not just approve/deny)
**Trigger:** After agent produces output, before it's acted upon
**Human effort:** Medium (read and annotate output)

### Description
The agent produces a deliverable (report, code, plan, content), then hands it to a human for review and feedback before the output is used or published. The human may accept, reject, or request changes.

### When to use
- All external-facing content (blog posts, press releases, customer emails)
- Strategic plans and major goal changes
- New agent system prompts
- Architecture decisions with long-term implications
- Any output that will be signed, published, or acted upon by external parties

### Implementation pattern
```
1. Agent completes draft output
2. Agent posts output with a clear "Review requested" flag
3. Agent sets task status to "in_review" and reassigns to human reviewer
4. Human reviews and either:
   a. Approves as-is → agent proceeds
   b. Provides feedback → agent incorporates and resubmits
   c. Rejects → agent escalates or closes task
5. Iteration limit: define max rounds (e.g., 3) before escalating to board
```

### Review request format
```markdown
## Review Requested: [DELIVERABLE NAME]

**Produced by:** [Agent name]
**Task:** [Link to issue]
**Output type:** [Blog post / Code change / Plan / Report]

**What I need from you:**
- [ ] Is the content accurate?
- [ ] Is the tone appropriate?
- [ ] Are there any compliance concerns?
- [ ] Approve to publish / merge / proceed?

**Output is attached below / linked here:** [link or content]
```

---

## Pattern 4: Tripwire / Circuit Breaker

**Type:** Automatic halt
**Trigger:** Anomaly detection (cost spike, error rate, unusual activity)
**Human effort:** Required to resume

### Description
Pre-defined thresholds that automatically pause all or specific agent operations when breached. Humans must explicitly resume operations after reviewing the situation.

### When to use
- Budget overrun risk
- Unusual error rates in production
- Unexpectedly high API call volume
- Any sign of an agent acting outside its defined scope

### Recommended tripwires

| Tripwire | Threshold | Default action |
|----------|-----------|----------------|
| Monthly budget | > 80% | Restrict to critical tasks only |
| Monthly budget | > 100% | Full pause, notify board immediately |
| Production error rate | > 5% for 15 min | Pause deployments, alert CTO |
| Single agent API spend | > 2x daily average | Pause that agent, alert CEO |
| Failed deployment | Any rollback | Pause further deployments until reviewed |
| External data breach signal | Any | Full pause, immediate board alert |

### Circuit breaker states
```
Normal → [threshold hit] → Restricted → [human review] → Normal
                                       → [escalate] → Full Pause → [explicit resume] → Normal
```

### Resume checklist
Before resuming after a circuit breaker trip:
- [ ] Root cause identified
- [ ] Anomaly resolved or explained
- [ ] Preventive measure added (if applicable)
- [ ] Board notified of incident and resolution
- [ ] Agent explicitly cleared to resume (not automatic)

---

## Pattern 5: Periodic Human Audit

**Type:** Proactive review
**Trigger:** Schedule (weekly/monthly)
**Human effort:** Medium

### Description
Regularly scheduled reviews where humans examine agent behavior in aggregate — not just individual approvals, but patterns over time. Are agents behaving as intended? Are there drift patterns or scope creep?

### What to audit

| Audit dimension | Questions to ask |
|----------------|-----------------|
| Decision patterns | Are agents making the decisions they're supposed to? Any unexpected choices? |
| Escalation rate | Too low may mean agents are under-escalating; too high means thresholds are wrong |
| Budget trends | Is spend growing? Is growth justified? |
| Task completion quality | Are done tasks actually done? Are outputs correct? |
| Agent-created content | Review a random sample of everything agents produced externally |
| Agent-to-agent interactions | Are agents coordinating as designed, or working around each other? |

### Audit log format (to be maintained)
```
## Audit — [DATE]

**Period covered:** [DATE RANGE]
**Auditor:** [HUMAN NAME]
**Agents reviewed:** [LIST]

### Findings
- [OBSERVATION 1]
- [OBSERVATION 2]

### Actions taken
- [ACTION 1: e.g., adjusted threshold, updated system prompt]

### Next audit scheduled: [DATE]
```

---

## Pattern 6: Escrow / Staged Release

**Type:** Phased authorization
**Trigger:** High-value or high-risk multi-step operations
**Human effort:** Low per step (but multiple steps)

### Description
Instead of approving a large, complex operation all at once, break it into stages. Each stage requires a separate authorization checkpoint. This limits the blast radius of any single mistake.

### When to use
- Multi-day product launches
- Large data migrations
- Multi-step financial operations
- New market expansions

### Example: staged deployment
```
Stage 1: Deploy to dev environment         → Auto (no approval needed)
Stage 2: Deploy to staging + QA           → Auto after tests pass
Stage 3: Deploy to 5% of production users → Human approval required
Stage 4: Deploy to 100% production        → Human approval required (separate)
Stage 5: Decommission old version          → Human approval required (7 days later)
```

Each stage has its own approval record, and later stages cannot proceed until earlier stages are explicitly signed off.

---

## Checkpoint Configuration Matrix

Use this to decide which patterns apply to which action types:

| Action | Approval Gate | Async Notify | Human Review | Tripwire | Audit |
|--------|--------------|-------------|-------------|---------|-------|
| Internal code changes | ❌ | ✅ (digest) | ❌ | ❌ | ✅ |
| Production deployment | ✅ | ✅ | ❌ | ✅ | ✅ |
| External content | ✅ | ✅ | ✅ | ❌ | ✅ |
| Financial transaction | ✅ (above limit) | ✅ | ❌ | ✅ | ✅ |
| New agent created | ✅ | ✅ | ✅ | ❌ | ✅ |
| Customer data access | ✅ | ✅ | ❌ | ✅ | ✅ |
| Legal commitments | ✅ | ✅ | ✅ | ❌ | ✅ |

---

## Getting the Balance Right

**Too many checkpoints** → approval fatigue, humans start rubber-stamping, agents slow to a crawl.
**Too few checkpoints** → errors compound undetected, humans lose visibility and trust.

### Calibration heuristics:
1. Start with more checkpoints, fewer as you build trust in specific agent behaviors.
2. Track how often approvals are denied. If < 5%, either the threshold is too low or agents are already self-filtering well.
3. After an incident, always add the checkpoint that would have caught it.
4. After 3 months of clean operation in an area, consider whether a checkpoint can be replaced by async notification.

---

*This document is part of the ZHC Governance Toolkit. Released under CC0.*
