export default function SettingsPage() {
  return (
    <section className="panel">
      <h2>Settings</h2>
      <p style={{ marginBottom: 8 }}>Global cadence, quiet hours, approval policy, and shell behavior will live here.</p>
      <p className="muted" style={{ marginBottom: 8 }}>
        Theme circles are live in the top navigation now: Black, Grey, White, Sepia, Walnut, Crimson, and Midnight.
      </p>
      <small>This page is still early, but the shell-level theming system is now in place.</small>
    </section>
  );
}
