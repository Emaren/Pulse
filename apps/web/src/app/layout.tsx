import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { builderStatus } from "@/lib/builder-status";
import { defaultTheme, themeNames, themeStorageKey } from "@/lib/themes";

export const metadata: Metadata = {
  title: "Pulse",
  description: "Campaign and publishing control tower",
};

const themeBootScript = `
(() => {
  try {
    const storageKey = ${JSON.stringify(themeStorageKey)};
    const fallback = ${JSON.stringify(defaultTheme)};
    const allowed = ${JSON.stringify(themeNames)};
    const stored = window.localStorage.getItem(storageKey);
    const theme = stored && allowed.includes(stored) ? stored : fallback;
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = ${JSON.stringify(defaultTheme)};
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <main className="shell">
          <section className="shell-banner">
            <div>
              <div className="eyebrow">Campaign Control Tower</div>
              <h1 className="shell-title">Pulse</h1>
              <p className="shell-subtitle">Builder-mode system for drafting, approval, cadence, and delivery across your project voices.</p>
            </div>
            <div className="shell-side">
              <div className="shell-badge">Builder mode</div>
              <small>{builderStatus.stageLabel}</small>
            </div>
          </section>
          <Nav />
          {children}
        </main>
      </body>
    </html>
  );
}
