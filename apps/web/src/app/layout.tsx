import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Pulse",
  description: "Campaign and publishing control tower",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>
          <h1 style={{ marginBottom: 8 }}>Pulse</h1>
          <small style={{ display: "block", marginBottom: 16 }}>Builder-mode control tower for drafting, approval, and delivery</small>
          <Nav />
          {children}
        </main>
      </body>
    </html>
  );
}
