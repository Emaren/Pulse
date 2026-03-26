import type { Destination } from "@/lib/api";

export type CadencePreset = {
  key: string;
  label: string;
  mode: Destination["cadence_mode"];
  dailyTarget: number;
  windows: string[];
  detail: string;
};

export const cadencePresets: CadencePreset[] = [
  {
    key: "heartbeat",
    label: "Heartbeat",
    mode: "normal",
    dailyTarget: 6,
    windows: ["08:00", "10:00", "13:00", "16:00", "19:00", "22:00"],
    detail: "Steady all-day presence for projects that should always feel alive.",
  },
  {
    key: "story_arc",
    label: "Story Arc",
    mode: "gentle",
    dailyTarget: 5,
    windows: ["09:00", "11:30", "14:30", "18:00", "21:00"],
    detail: "A lighter rhythm that still keeps a project visibly moving.",
  },
  {
    key: "launch_runway",
    label: "Launch Runway",
    mode: "launch",
    dailyTarget: 6,
    windows: ["07:30", "09:30", "12:00", "15:00", "18:30", "21:30"],
    detail: "High-energy cadence for launches, pushes, or coordinated attention windows.",
  },
  {
    key: "quiet_watch",
    label: "Quiet Watch",
    mode: "quiet",
    dailyTarget: 3,
    windows: ["10:00", "16:00", "21:00"],
    detail: "Low-noise maintenance mode for quieter periods.",
  },
];
