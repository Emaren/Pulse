export const builderStatus = {
  overall: 0.77,
  target: 1,
  stageLabel: "Observation inbox slice shipped",
  modules: [
    {
      label: "Control Tower UI",
      score: 0.84,
      detail: "The shell now behaves like a true admin deck with project controls, context intake, a live observation inbox, a cadence planner, and real automation settings.",
    },
    {
      label: "Destinations",
      score: 0.66,
      detail: "Destinations now sit inside a seeded project catalog, inherit cadence presets, and participate in automation preview, autopilot, and signal-driven draft creation.",
    },
    {
      label: "Draft Library",
      score: 0.82,
      detail: "Drafts now have manual lanes plus a real path for observed repo/context changes to land in a deduped inbox and become reviewable posts.",
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
      score: 0.65,
      detail: "The deploy lane is real, the app can self-seed on boot, and Pulse now exposes a cleaner inbound signal contract, but rollback and deeper production visibility still need work.",
    },
    {
      label: "Security",
      score: 0.35,
      detail: "This is still lagging; token handling and environment hardening are not where they need to be yet.",
    },
  ],
} as const;
