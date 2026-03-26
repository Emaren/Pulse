export const builderStatus = {
  overall: 0.72,
  target: 1,
  stageLabel: "Autopilot policy slice shipped",
  modules: [
    {
      label: "Control Tower UI",
      score: 0.8,
      detail: "The shell now behaves like a true admin deck with project controls, context intake, a live cadence planner, and real automation settings.",
    },
    {
      label: "Destinations",
      score: 0.64,
      detail: "Destinations now sit inside a seeded project catalog, inherit cadence presets, and participate in a real automation preview and autopilot loop.",
    },
    {
      label: "Draft Library",
      score: 0.75,
      detail: "Drafts now have manual lanes plus a real path for observed repo/context changes to turn into reviewable posts ready for automation pickup.",
    },
    {
      label: "Scheduling Engine",
      score: 0.8,
      detail: "Pulse can now preview and run destination-aware cadence scheduling with windows, daily targets, cooldowns, quiet hours, and no-repeat guards.",
    },
    {
      label: "Worker Dispatch",
      score: 0.74,
      detail: "Delivery remains one of the stronger modules and now receives cleaner queue inputs from manual routing and background cadence automation.",
    },
    {
      label: "Ops",
      score: 0.63,
      detail: "The deploy lane is real, the app can self-seed on boot, and automation policy is now durable, but rollback and deeper production visibility still need work.",
    },
    {
      label: "Security",
      score: 0.35,
      detail: "This is still lagging; token handling and environment hardening are not where they need to be yet.",
    },
  ],
} as const;
