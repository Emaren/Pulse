"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { Destination, Draft, Project } from "@/lib/api";

type PostStudioProps = {
  projects: Project[];
  destinations: Destination[];
  drafts: Draft[];
};

const defaultWindows = "08:00, 10:00, 14:00, 19:00, 23:30";

export function PostStudio({ projects, destinations, drafts }: PostStudioProps) {
  const router = useRouter();

  const [destinationProjectSlug, setDestinationProjectSlug] = useState(projects[0]?.slug ?? "");
  const [destinationPlatform, setDestinationPlatform] = useState<"facebook" | "x">("facebook");
  const [destinationName, setDestinationName] = useState("");
  const [externalRef, setExternalRef] = useState("");
  const [cadenceMode, setCadenceMode] = useState<Destination["cadence_mode"]>("normal");
  const [dailyPostTarget, setDailyPostTarget] = useState("2");
  const [windowsText, setWindowsText] = useState(defaultWindows);

  const [projectSlug, setProjectSlug] = useState(projects[0]?.slug ?? "");
  const [selectedDestinationId, setSelectedDestinationId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sourceType, setSourceType] = useState("manual");
  const [kind, setKind] = useState("fresh");

  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const availableDestinations = destinations.filter((destination) => destination.project_slug === projectSlug && destination.active);

  useEffect(() => {
    if (availableDestinations.length === 0) {
      setSelectedDestinationId("");
      return;
    }

    const alreadyValid = availableDestinations.some((destination) => String(destination.id) === selectedDestinationId);
    if (!alreadyValid) {
      setSelectedDestinationId(String(availableDestinations[0].id));
    }
  }, [availableDestinations, selectedDestinationId]);

  function firstDestinationIdForProject(targetProjectSlug: string): number | null {
    const match = destinations.find((destination) => destination.project_slug === targetProjectSlug && destination.active);
    return match ? match.id : null;
  }

  async function handleCreateDestination(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!destinationProjectSlug || !destinationName.trim()) return;

    setBusy(true);
    setMessage(null);

    try {
      const res = await fetch("/api/destinations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            project_slug: destinationProjectSlug,
            platform: destinationPlatform,
            name: destinationName.trim(),
            external_ref: externalRef.trim() || null,
            cadence_mode: cadenceMode,
            daily_post_target: Number(dailyPostTarget || 0),
            windows: windowsText
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
            requires_approval: true,
            active: true,
          },
        ]),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? `Request failed (${res.status})`);
      }

      setDestinationName("");
      setExternalRef("");
      setMessage("Destination saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save destination");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectSlug || !title.trim() || !body.trim()) return;

    setBusy(true);
    setMessage(null);

    try {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_slug: projectSlug,
          destination_id: selectedDestinationId ? Number(selectedDestinationId) : null,
          title: title.trim(),
          body: body.trim(),
          source_type: sourceType,
          kind,
          priority: 50,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? `Request failed (${res.status})`);
      }

      setTitle("");
      setBody("");
      setMessage("Draft created.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create draft");
    } finally {
      setBusy(false);
    }
  }

  async function approveDraft(draftId: number) {
    setBusy(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/drafts/${draftId}/approve`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? `Request failed (${res.status})`);
      }

      setMessage("Draft approved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not approve draft");
    } finally {
      setBusy(false);
    }
  }

  async function queueDraft(draft: Draft) {
    setBusy(true);
    setMessage(null);

    try {
      const fallbackDestinationId = firstDestinationIdForProject(draft.project_slug);
      const destinationId = draft.destination_id ?? fallbackDestinationId;
      if (!destinationId) {
        throw new Error("Add a destination for this project before queueing");
      }

      const res = await fetch(`/api/drafts/${draft.id}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination_id: destinationId,
          mode: "exact",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? `Request failed (${res.status})`);
      }

      setMessage("Draft queued.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not queue draft");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid two">
        <section className="panel">
          <h3>Publishing Destinations</h3>
          <p style={{ marginTop: 0 }}>
            In plain English: these are the pages or accounts that speak on behalf of each project.
          </p>
          <form onSubmit={handleCreateDestination} className="grid" style={{ gap: 12 }}>
            <label style={fieldStyle}>
              <small>Project</small>
              <select value={destinationProjectSlug} onChange={(event) => setDestinationProjectSlug(event.target.value)} style={inputStyle} disabled={busy}>
                {projects.map((project) => (
                  <option key={project.slug} value={project.slug}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <label style={fieldStyle}>
                <small>Platform</small>
                <select
                  value={destinationPlatform}
                  onChange={(event) => setDestinationPlatform(event.target.value as "facebook" | "x")}
                  style={inputStyle}
                  disabled={busy}
                >
                  <option value="facebook">Facebook</option>
                  <option value="x">X</option>
                </select>
              </label>

              <label style={{ ...fieldStyle, flex: 1 }}>
                <small>Destination name</small>
                <input
                  value={destinationName}
                  onChange={(event) => setDestinationName(event.target.value)}
                  placeholder="TokenTap Facebook Page"
                  style={inputStyle}
                  disabled={busy}
                />
              </label>
            </div>

            <label style={fieldStyle}>
              <small>External ref / page ID</small>
              <input
                value={externalRef}
                onChange={(event) => setExternalRef(event.target.value)}
                placeholder="Facebook page ID if you have it"
                style={inputStyle}
                disabled={busy}
              />
            </label>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <label style={fieldStyle}>
                <small>Cadence mode</small>
                <select value={cadenceMode} onChange={(event) => setCadenceMode(event.target.value as Destination["cadence_mode"])} style={inputStyle} disabled={busy}>
                  <option value="gentle">Gentle</option>
                  <option value="normal">Normal</option>
                  <option value="aggressive">Aggressive</option>
                  <option value="launch">Launch</option>
                  <option value="quiet">Quiet</option>
                </select>
              </label>

              <label style={fieldStyle}>
                <small>Daily target</small>
                <input value={dailyPostTarget} onChange={(event) => setDailyPostTarget(event.target.value)} style={inputStyle} disabled={busy} />
              </label>
            </div>

            <label style={fieldStyle}>
              <small>Preferred windows</small>
              <input value={windowsText} onChange={(event) => setWindowsText(event.target.value)} style={inputStyle} disabled={busy} />
            </label>

            <button type="submit" style={primaryBtnStyle(!busy)}>
              Save destination
            </button>
          </form>
        </section>

        <section className="panel">
          <h3>Draft Library</h3>
          <p style={{ marginTop: 0 }}>
            A draft is content that exists before it is queued. That is the first big step toward a real approval inbox.
          </p>
          <form onSubmit={handleCreateDraft} className="grid" style={{ gap: 12 }}>
            <label style={fieldStyle}>
              <small>Project</small>
              <select value={projectSlug} onChange={(event) => setProjectSlug(event.target.value)} style={inputStyle} disabled={busy}>
                {projects.map((project) => (
                  <option key={project.slug} value={project.slug}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={fieldStyle}>
              <small>Destination</small>
              <select value={selectedDestinationId} onChange={(event) => setSelectedDestinationId(event.target.value)} style={inputStyle} disabled={busy || availableDestinations.length === 0}>
                {availableDestinations.length === 0 ? <option value="">No destination yet</option> : null}
                {availableDestinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.name} · {destination.platform}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <label style={{ ...fieldStyle, flex: 1 }}>
                <small>Title</small>
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What changed?" style={inputStyle} disabled={busy} />
              </label>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <label style={fieldStyle}>
                <small>Source type</small>
                <select value={sourceType} onChange={(event) => setSourceType(event.target.value)} style={inputStyle} disabled={busy}>
                  <option value="manual">Manual</option>
                  <option value="repo_update">Repo update</option>
                  <option value="evergreen">Evergreen</option>
                  <option value="resurface">Resurface</option>
                  <option value="support">Support</option>
                </select>
              </label>

              <label style={fieldStyle}>
                <small>Kind</small>
                <select value={kind} onChange={(event) => setKind(event.target.value)} style={inputStyle} disabled={busy}>
                  <option value="fresh">Fresh</option>
                  <option value="evergreen">Evergreen</option>
                  <option value="resurface">Resurface</option>
                  <option value="support">Support</option>
                </select>
              </label>
            </div>

            <label style={fieldStyle}>
              <small>Body</small>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write the post draft here..."
                rows={8}
                style={{ ...inputStyle, resize: "vertical" }}
                disabled={busy}
              />
            </label>

            <button type="submit" style={primaryBtnStyle(!busy)}>
              Save draft
            </button>
          </form>
        </section>
      </div>

      <section className="panel">
        <h3>Current Destinations</h3>
        {destinations.length === 0 ? (
          <small>No publishing destinations yet.</small>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th align="left" style={thStyle}>Project</th>
                <th align="left" style={thStyle}>Destination</th>
                <th align="left" style={thStyle}>Cadence</th>
                <th align="left" style={thStyle}>Windows</th>
              </tr>
            </thead>
            <tbody>
              {destinations.map((destination) => (
                <tr key={destination.id}>
                  <td style={tdStyle}>{destination.project_slug}</td>
                  <td style={tdStyle}>
                    {destination.name} · {destination.platform}
                  </td>
                  <td style={tdStyle}>
                    {destination.cadence_mode} · {destination.daily_post_target}/day
                  </td>
                  <td style={tdStyle}>{destination.windows.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h3>Draft Board</h3>
        {message ? <p style={{ marginTop: 0 }}>{message}</p> : null}
        {drafts.length === 0 ? (
          <small>No drafts yet. Create one above and it will land here before it ever hits the queue.</small>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th align="left" style={thStyle}>Status</th>
                <th align="left" style={thStyle}>Project</th>
                <th align="left" style={thStyle}>Destination</th>
                <th align="left" style={thStyle}>Draft</th>
                <th align="left" style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((draft) => {
                const canApprove = !["approved", "queued", "published", "archived"].includes(draft.status);
                const canQueue = !["queued", "published", "archived", "rejected"].includes(draft.status);

                return (
                  <tr key={draft.id}>
                    <td style={tdStyle}>{draft.status}</td>
                    <td style={tdStyle}>{draft.project_slug}</td>
                    <td style={tdStyle}>{draft.destination_name ?? "Pick one when queueing"}</td>
                    <td style={tdStyle}>
                      <strong>{draft.title}</strong>
                      <div style={{ marginTop: 6, opacity: 0.85 }}>{draft.body}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" style={btnStyle(!busy && canApprove)} disabled={busy || !canApprove} onClick={() => approveDraft(draft.id)}>
                          Approve
                        </button>
                        <button type="button" style={primaryBtnStyle(!busy && canQueue)} disabled={busy || !canQueue} onClick={() => queueDraft(draft)}>
                          Queue
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 6,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 10,
  background: "white",
  font: "inherit",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: CSSProperties = {
  padding: "8px 6px",
  borderBottom: "1px solid #ddd",
};

const tdStyle: CSSProperties = {
  padding: "10px 6px",
  borderBottom: "1px solid #eee",
  verticalAlign: "top",
};

function btnStyle(enabled: boolean): CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "white",
    opacity: enabled ? 1 : 0.55,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}

function primaryBtnStyle(enabled: boolean): CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "var(--paper)",
    fontWeight: 600,
    opacity: enabled ? 1 : 0.55,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}
