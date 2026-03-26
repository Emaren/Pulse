import { AutomationSettingsPanel } from "@/components/AutomationSettingsPanel";
import { getAutomationSettings, type AutomationSettings } from "@/lib/api";

export default async function SettingsPage() {
  let settings: AutomationSettings = {
    cadence_enabled: false,
    cadence_interval_minutes: 30,
    cadence_run_limit: 6,
    quiet_hours: [],
    last_cadence_run_at: null,
  };

  try {
    settings = await getAutomationSettings();
  } catch {
    // Keep the page renderable when the API is unavailable.
  }

  return (
    <section className="grid" style={{ gap: 16 }}>
      <AutomationSettingsPanel initialSettings={settings} />
      <section className="panel">
        <h2>Shell Settings</h2>
        <p style={{ marginBottom: 8 }}>Theme circles are live in the top navigation now: Black, Grey, White, Sepia, Walnut, Crimson, and Midnight.</p>
        <small>This page now controls real automation policy; shell theming remains globally available from the top navigation.</small>
      </section>
    </section>
  );
}
