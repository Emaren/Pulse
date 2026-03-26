export const dynamic = "force-dynamic";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.PULSE_API_BASE_URL ??
  "http://localhost:3390";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.text();

  const upstream = await fetch(`${API_BASE}/templates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
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

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;

  const upstream = await fetch(`${API_BASE}/templates/${id}`, {
    method: "DELETE",
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
