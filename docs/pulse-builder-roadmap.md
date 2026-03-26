# Pulse Builder Roadmap

## Builder score

This is a relative "distance from ideal" score for tracking progress without pretending the repo is further along than it is.

- Overall builder score: `0.62 / 1.00`
- Semantic package versions: still `0.1.0`
- Interpretation: Pulse is out of shell territory now, but the premium control-tower product is still in the middle innings

## Module scorecard

| Module | Current | Target | Plain-English read |
| --- | --- | --- | --- |
| Control tower UI | 0.74 | 0.90 | The shell now acts like a real admin deck with seeded projects, a live template library, and context intake |
| Destination/page control | 0.60 | 0.90 | Pulse has durable destination objects plus cadence presets, though policy depth is still early |
| Draft library + approval | 0.69 | 0.95 | The inbox now supports both manual drafting and context-generated draft creation before approval |
| Scheduling/cadence engine | 0.64 | 0.90 | Approved drafts can land in the next configured destination window, but cooldowns and scoring are still ahead |
| Worker dispatch | 0.63 | 0.85 | The worker remains one of the stronger pieces and now reports draft publication state |
| Ops + deploy ergonomics | 0.58 | 0.85 | Deploy automation is now real and startup seeding removes empty-shell boots, but rollback confidence is still not there |
| Security posture | 0.35 | 0.85 | Token handling and environment discipline still need tightening |

## What is true right now

- Pulse is still shaped like a social post queue more than a campaign brain.
- The best existing foundation is the API/worker split and the audit-aware dispatch loop.
- The operator surface is now materially stronger and much less scaffold-like.
- The next architectural gap is deeper cadence intelligence: cooldowns, no-repeat rules, and policy scoring.
- The first cross-stack automation hook now exists: observed context can become a draft without bypassing review.

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
- current state: next-slot queueing now honors configured destination windows, but deeper scoring and cooldown logic are still ahead

### Phase 5: cross-project support

- model safe reshare/support rules between projects
- keep supportive interactions explicit and policy-driven
- avoid circular or obviously robotic behavior

### Phase 6: cross-stack contracts

- harden Pulse -> TMail -> Traffic metadata contracts
- keep Pulse as campaign intent truth
- keep execution truth downstream
- keep VPSSentry/full-context-all on the observation side and let Pulse own draft generation + approval

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
