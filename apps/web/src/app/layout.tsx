import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Pulse",
  description: "Marketing automation control panel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>
          <h1 style={{ marginBottom: 8 }}>Pulse</h1>
          <small style={{ display: "block", marginBottom: 16 }}>Auto-marketer control panel</small>
          <Nav />
          {children}
        </main>
      </body>
    </html>
  );
}
