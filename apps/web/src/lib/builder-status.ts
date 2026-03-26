export const builderStatus = {
  overall: 0.82,
  target: 1,
  stageLabel: "Evergreen content bank slice shipped",
  modules: [
    {
      label: "Control Tower UI",
      score: 0.87,
      detail: "The shell now behaves like a true admin deck with project controls, context intake, a live observation inbox, cadence controls, automation settings, and visible evergreen shelf health.",
    },
    {
      label: "Destinations",
      score: 0.68,
      detail: "Destinations now sit inside a seeded project catalog, inherit cadence presets, and participate in automation preview, autopilot, signal-driven drafting, and evergreen bank stocking.",
    },
    {
      label: "Draft Library",
      score: 0.89,
      detail: "Drafts now support manual authoring, deduped observation intake, and a reusable evergreen content bank so Pulse is not dependent on fresh signals alone.",
    },
    {
      label: "Scheduling Engine",
      score: 0.84,
      detail: "Pulse can now preview and run destination-aware cadence scheduling with windows, daily targets, cooldowns, quiet hours, no-repeat guards, and a stocked evergreen fallback supply.",
    },
    {
      label: "Worker Dispatch",
      score: 0.75,
      detail: "Delivery remains one of the stronger modules and now receives cleaner queue inputs from manual routing, background cadence automation, and evergreen bank-backed selection.",
    },
    {
      label: "Ops",
      score: 0.67,
      detail: "The deploy lane is real, the app can self-seed on boot, Pulse now exposes a cleaner inbound signal contract, and evergreen stocking can be triggered from the admin surface, but rollback and deeper production visibility still need work.",
    },
    {
      label: "Security",
      score: 0.35,
      detail: "This is still lagging; token handling and environment hardening are not where they need to be yet.",
    },
  ],
} as const;
