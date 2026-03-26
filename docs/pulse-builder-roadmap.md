# Pulse Builder Roadmap

## Builder score

This is a relative "distance from ideal" score for tracking progress without pretending the repo is further along than it is.

- Overall builder score: `0.86 / 1.00`
- Semantic package versions: still `0.1.0`
- Interpretation: Pulse now has a real admin deck, a durable cadence policy layer, a worker-triggered autopilot path, a real observation inbox for `full-context-all`-style signals, an evergreen content bank for fallback fuel, and a smarter selection layer that can choose between fresh and evergreen content more deliberately, but the premium control-tower product still needs fuller cross-stack wiring and deeper policy depth

## Module scorecard

| Module | Current | Target | Plain-English read |
| --- | --- | --- | --- |
| Control tower UI | 0.89 | 0.90 | The shell now acts like a real admin deck with seeded projects, a live template library, context intake, an observation inbox, a cadence planner, automation policy controls, visible evergreen shelf health, and recommendation reasoning in the planner |
| Destination/page control | 0.70 | 0.90 | Pulse has durable destination objects, cadence presets, quiet-hour-aware planning, signal-driven draft routing, and mix-aware recommendation behavior across multiple voice lanes |
| Draft library + approval | 0.91 | 0.95 | The inbox now supports manual drafting, deduped context-signal ingestion, and evergreen bank seeding so approval/autopilot are not starved between fresh signals |
| Scheduling/cadence engine | 0.88 | 0.90 | Pulse can now preview and run destination-aware cadence scheduling with daily targets, cooldowns, quiet hours, no-repeat guards, a stocked evergreen fallback supply, and a smarter fresh-versus-evergreen chooser |
| Worker dispatch | 0.77 | 0.85 | The worker remains one of the stronger pieces and can now trigger cadence runs in the background when the policy is armed while drawing from a healthier and smarter-ranked draft inventory |
| Ops + deploy ergonomics | 0.68 | 0.85 | Deploy automation is now real, startup seeding removes empty-shell boots, Pulse exposes a cleaner inbound signal contract, and evergreen stocking can be triggered from the admin surface, but rollback confidence is still not there |
| Security posture | 0.35 | 0.85 | Token handling and environment discipline still need tightening |

## What is true right now

- Pulse is still shaped like a social post queue more than a campaign brain.
- The best existing foundation is the API/worker split and the audit-aware dispatch loop.
- The operator surface is now materially stronger and much less scaffold-like.
- The next architectural gap is deeper policy intelligence: better scoring between fresh, evergreen, and resurfaced drafts, plus safer cross-project support behavior.
- The first cross-stack automation hook now exists: observed context can become a draft without bypassing review.
- Pulse now has a durable observation inbox and dedupe contract for `full-context-all`-style signals.
- Cadence automation can now preview, run, and background-trigger from the worker when armed, but the caller side that should post into Pulse still needs to be wired.
- Pulse now has a shared evergreen content bank, so it can stock fallback drafts from reusable playbooks instead of going silent whenever fresh observations slow down.
- Cadence preview now explains why it picked a draft, using recent queue mix and fresh-versus-evergreen pressure instead of acting like a black box.

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
- add a durable autopilot policy layer with quiet hours and run limits
- current state: Pulse can preview and run cadence automation with daily targets, cooldowns, quiet hours, no-repeat guards, worker-triggered autopilot when armed, a stocked evergreen fallback supply, and a real fresh-versus-evergreen selection layer, but cross-project support policy and deeper scoring are still ahead

### Phase 5: cross-project support

- model safe reshare/support rules between projects
- keep supportive interactions explicit and policy-driven
- avoid circular or obviously robotic behavior

### Phase 6: cross-stack contracts

- harden Pulse -> TMail -> Traffic metadata contracts
- keep Pulse as campaign intent truth
- keep execution truth downstream
- keep VPSSentry/full-context-all on the observation side and let Pulse own draft generation + approval
- current state: Pulse now exposes a deduped `/signals/ingest` landing zone for trusted observation systems, but the caller still needs to post into it

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
