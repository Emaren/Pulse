import Link from "next/link";

const links = [
  ["Dashboard", "/"],
  ["Studio", "/studio"],
  ["Projects", "/projects"],
  ["Templates", "/templates"],
  ["Queue", "/queue"],
  ["Accounts", "/accounts"],
  ["Settings", "/settings"],
] as const;

export function Nav() {
  return (
    <nav className="panel" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {links.map(([label, href]) => (
          <Link key={href} href={href} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d9d2c5" }}>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
