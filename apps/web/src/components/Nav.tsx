"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeSwitcher } from "@/components/ThemeSwitcher";

const links = [
  ["Admin", "/"],
  ["Studio", "/studio"],
  ["Projects", "/projects"],
  ["Templates", "/templates"],
  ["Queue", "/queue"],
  ["Accounts", "/accounts"],
  ["Settings", "/settings"],
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="panel nav-shell">
      <div className="nav-row">
        <div className="nav-links">
        {links.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className={`nav-link ${pathname === href || (href !== "/" && pathname.startsWith(href)) ? "is-active" : ""}`}
          >
            {label}
          </Link>
        ))}
        </div>
        <ThemeSwitcher />
      </div>
    </nav>
  );
}
