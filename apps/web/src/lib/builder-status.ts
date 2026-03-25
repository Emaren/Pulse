export const builderStatus = {
  overall: 0.43,
  target: 1,
  stageLabel: "Foundation slice shipped",
  modules: [
    {
      label: "Control Tower UI",
      score: 0.45,
      detail: "The dashboard exposes real builder state, but the premium studio feel is still ahead of us.",
    },
    {
      label: "Destinations",
      score: 0.4,
      detail: "Pulse now knows which page/account is meant to speak, including cadence basics.",
    },
    {
      label: "Draft Library",
      score: 0.45,
      detail: "Drafts now exist before queueing, with approval and queue handoff in place.",
    },
    {
      label: "Scheduling Engine",
      score: 0.5,
      detail: "Scheduling works, but the richer window scoring and cooldown logic still needs to come next.",
    },
    {
      label: "Worker Dispatch",
      score: 0.62,
      detail: "Delivery remains one of the stronger modules and now feeds draft publication state.",
    },
    {
      label: "Ops",
      score: 0.55,
      detail: "Deploy automation is now real, but rollback and deeper production visibility still need work.",
    },
    {
      label: "Security",
      score: 0.35,
      detail: "This is still lagging; token handling and environment hardening are not where they need to be yet.",
    },
  ],
} as const;
