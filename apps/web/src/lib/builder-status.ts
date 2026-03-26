export const builderStatus = {
  overall: 0.86,
  target: 1,
  stageLabel: "Selection intelligence slice shipped",
  modules: [
    {
      label: "Control Tower UI",
      score: 0.89,
      detail: "The shell now behaves like a true admin deck with project controls, context intake, a live observation inbox, cadence controls, automation settings, visible evergreen shelf health, and clearer recommendation logic in the planner.",
    },
    {
      label: "Destinations",
      score: 0.7,
      detail: "Destinations now sit inside a seeded project catalog, inherit cadence presets, and participate in automation preview, autopilot, signal-driven drafting, evergreen bank stocking, and mix-aware recommendation logic.",
    },
    {
      label: "Draft Library",
      score: 0.91,
      detail: "Drafts now support manual authoring, deduped observation intake, a reusable evergreen content bank, and cleaner separation between fresh signals and fallback inventory.",
    },
    {
      label: "Scheduling Engine",
      score: 0.88,
      detail: "Pulse can now preview and run destination-aware cadence scheduling with windows, daily targets, cooldowns, quiet hours, no-repeat guards, a stocked evergreen fallback supply, and real mix-aware draft selection.",
    },
    {
      label: "Worker Dispatch",
      score: 0.77,
      detail: "Delivery remains one of the stronger modules and now receives cleaner queue inputs from manual routing, background cadence automation, and smarter bank-backed selection.",
    },
    {
      label: "Ops",
      score: 0.68,
      detail: "The deploy lane is real, the app can self-seed on boot, Pulse exposes a cleaner inbound signal contract, and evergreen stocking can be triggered from the admin surface, but rollback and deeper production visibility still need work.",
    },
    {
      label: "Security",
      score: 0.35,
      detail: "This is still lagging; token handling and environment hardening are not where they need to be yet.",
    },
  ],
} as const;
