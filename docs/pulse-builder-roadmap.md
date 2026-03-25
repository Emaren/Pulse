# Pulse Builder Roadmap

## Builder score

This is a relative "distance from ideal" score for tracking progress without pretending the repo is further along than it is.

- Overall builder score: `0.43 / 1.00`
- Semantic package versions: still `0.1.0`
- Interpretation: the skeleton is good, but the premium control-tower product is still early

## Module scorecard

| Module | Current | Target | Plain-English read |
| --- | --- | --- | --- |
| Control tower UI | 0.45 | 0.90 | The dashboard now exposes builder state, but it is still early compared with the premium target |
| Destination/page control | 0.40 | 0.90 | Pulse now has durable destination objects, but not yet the richer policy model |
| Draft library + approval | 0.45 | 0.95 | Draft persistence and approval have started, but the inbox experience is still basic |
| Scheduling/cadence engine | 0.50 | 0.90 | Queue scheduling works, but it is not yet fully window/scoring/cooldown driven |
| Worker dispatch | 0.62 | 0.85 | The worker remains one of the stronger pieces and now reports draft publication state |
| Ops + deploy ergonomics | 0.55 | 0.85 | Deploy automation is now real, but still needs stronger runtime checks and rollback confidence |
| Security posture | 0.35 | 0.85 | Token handling and environment discipline still need tightening |

## What is true right now

- Pulse is still shaped like a social post queue more than a campaign brain.
- The best existing foundation is the API/worker split and the audit-aware dispatch loop.
- The biggest visible weakness is the operator surface.
- The biggest architectural gap is the lack of durable destination and draft-library objects.

## Upgrade path

### Phase 1: control-tower foundation

- add durable publishing destinations
- add durable post drafts
- keep the existing queue worker as the execution lane
- expose clear builder progress in the dashboard
- remove obvious dead weight and deploy friction

### Phase 2: premium studio

- replace thin compose UX with a richer post studio
- add split preview, campaign context, better scheduling controls, and asset handling
- mine the best layout/editor patterns from the stronger admin surfaces in the stack

### Phase 3: approval inbox

- move from "queue this text" to "review this draft"
- support approve, reject, archive, reschedule, and needs-attention flows
- show why an item was chosen and where it is headed

### Phase 4: cadence automation

- give each destination windows, daily targets, and cadence modes
- score fresh, evergreen, and resurfaced content
- add no-repeat and cooldown rules
- keep auto-run limited to content that has already been approved

### Phase 5: cross-project support

- model safe reshare/support rules between projects
- keep supportive interactions explicit and policy-driven
- avoid circular or obviously robotic behavior

### Phase 6: cross-stack contracts

- harden Pulse -> TMail -> Traffic metadata contracts
- keep Pulse as campaign intent truth
- keep execution truth downstream

## First implementation slice

The safest high-return slice is:

1. add destinations so Pulse knows which page/account is supposed to speak
2. add post drafts so content can exist before it is queued
3. allow approved drafts to hand off into the existing queue/worker
4. surface the new builder state in the dashboard

## Builder-mode guardrails

- Delete only obvious dead weight.
- Prefer additive changes over destructive rewrites.
- Keep the current queue worker alive while the control tower grows around it.
- Do not move delivery-system ownership into Pulse.
