export const builderStatus = {
  overall: 0.51,
  target: 1,
  stageLabel: "Theme + inbox slice shipped",
  modules: [
    {
      label: "Control Tower UI",
      score: 0.62,
      detail: "The shell now has real theming, a stronger dashboard, and a much more operational Studio surface.",
    },
    {
      label: "Destinations",
      score: 0.43,
      detail: "Destinations are durable now, and the UI finally treats them like first-class brand voices.",
    },
    {
      label: "Draft Library",
      score: 0.6,
      detail: "Drafts now have review lanes beyond simple approve/queue, which makes the inbox model much more real.",
    },
    {
      label: "Scheduling Engine",
      score: 0.52,
      detail: "Scheduling still works, but the next big step is true window scoring, cooldowns, and cadence selection.",
    },
    {
      label: "Worker Dispatch",
      score: 0.63,
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
