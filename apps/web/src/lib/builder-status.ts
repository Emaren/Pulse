export const builderStatus = {
  overall: 0.62,
  target: 1,
  stageLabel: "Project catalog + cadence + context intake slice shipped",
  modules: [
    {
      label: "Control Tower UI",
      score: 0.74,
      detail: "The shell now behaves like a real admin deck with project management, a live library, and a working context-intake lane.",
    },
    {
      label: "Destinations",
      score: 0.6,
      detail: "Destinations now sit inside a seeded project catalog and can inherit named cadence presets instead of hand-entered windows every time.",
    },
    {
      label: "Draft Library",
      score: 0.69,
      detail: "Drafts now have manual lanes plus a real path for observed repo/context changes to turn into reviewable posts.",
    },
    {
      label: "Scheduling Engine",
      score: 0.64,
      detail: "Queueing can now honor destination windows for the next cadence slot, though cooldowns and scoring still need a deeper pass.",
    },
    {
      label: "Worker Dispatch",
      score: 0.63,
      detail: "Delivery remains one of the stronger modules and now feeds draft publication state.",
    },
    {
      label: "Ops",
      score: 0.58,
      detail: "The deploy lane is real and the app can self-seed on boot, but rollback and deeper production visibility still need work.",
    },
    {
      label: "Security",
      score: 0.35,
      detail: "This is still lagging; token handling and environment hardening are not where they need to be yet.",
    },
  ],
} as const;
