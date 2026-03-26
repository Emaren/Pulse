export const builderStatus = {
  overall: 0.67,
  target: 1,
  stageLabel: "Cadence planner slice shipped",
  modules: [
    {
      label: "Control Tower UI",
      score: 0.78,
      detail: "The shell now behaves like a true admin deck with project controls, context intake, and a live cadence planner.",
    },
    {
      label: "Destinations",
      score: 0.62,
      detail: "Destinations now sit inside a seeded project catalog, inherit cadence presets, and participate in a real automation preview.",
    },
    {
      label: "Draft Library",
      score: 0.73,
      detail: "Drafts now have manual lanes plus a real path for observed repo/context changes to turn into reviewable posts ready for cadence runs.",
    },
    {
      label: "Scheduling Engine",
      score: 0.72,
      detail: "Pulse can now preview and run destination-aware cadence scheduling with windows, daily targets, cooldowns, and no-repeat guards.",
    },
    {
      label: "Worker Dispatch",
      score: 0.64,
      detail: "Delivery remains one of the stronger modules and now receives cleaner queue inputs from both manual and cadence-driven routing.",
    },
    {
      label: "Ops",
      score: 0.6,
      detail: "The deploy lane is real and the app can self-seed on boot, but rollback and deeper production visibility still need work.",
    },
    {
      label: "Security",
      score: 0.35,
      detail: "This is still lagging; token handling and environment hardening are not where they need to be yet.",
    },
  ],
} as const;
