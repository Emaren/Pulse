export const dynamic = "force-dynamic";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.PULSE_API_BASE_URL ??
  "http://localhost:3390";

export async function POST() {
  const upstream = await fetch(`${API_BASE}/projects/seed`, {
    method: "POST",
    cache: "no-store",
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
