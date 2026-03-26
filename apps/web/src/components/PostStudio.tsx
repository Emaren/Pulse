"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { Destination, Draft, Project } from "@/lib/api";
import { cadencePresets } from "@/lib/cadence-presets";

type PostStudioProps = {
  projects: Project[];
  destinations: Destination[];
  drafts: Draft[];
};

type MessageTone = "success" | "error";

type StudioMessage = {
  tone: MessageTone;
  text: string;
};

type DraftLane = {
  key: string;
  title: string;
  help: string;
  statuses: string[];
};

const defaultWindows = cadencePresets[0]?.windows.join(", ") ?? "08:00, 10:00, 14:00, 19:00, 23:30";

const draftLanes: DraftLane[] = [
  {
    key: "new",
    title: "New Drafts",
    help: "Fresh ideas waiting for approval or cleanup.",
    statuses: ["draft"],
  },
  {
    key: "needs_attention",
    title: "Needs Attention",
    help: "Items that need a human pass before they should move again.",
    statuses: ["needs_attention"],
  },
  {
    key: "approved",
    title: "Approved",
    help: "Ready for the queue once you pick the moment.",
    statuses: ["approved"],
  },
  {
    key: "active",
    title: "Active",
    help: "Queued and published posts already moving through the system.",
    statuses: ["queued", "published"],
  },
  {
    key: "cold_storage",
    title: "Cold Storage",
    help: "Rejected or archived posts kept for reference.",
    statuses: ["rejected", "archived"],
  },
];

function formatWhen(value: string | null | undefined): string {
  if (!value) return "No timestamp yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function trimBody(value: string, max = 180): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

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

  const [message, setMessage] = useState<StudioMessage | null>(null);
  const [busy, setBusy] = useState(false);

  const activeDestinations = destinations.filter((destination) => destination.active);
  const availableDestinations = activeDestinations.filter((destination) => destination.project_slug === projectSlug);
  const previewProject = projects.find((project) => project.slug === projectSlug) ?? null;
  const previewDestination = availableDestinations.find((destination) => String(destination.id) === selectedDestinationId) ?? null;

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

  function setFeedback(tone: MessageTone, text: string) {
    setMessage({ tone, text });
  }

  function applyCadencePreset(presetKey: string) {
    const preset = cadencePresets.find((item) => item.key === presetKey);
    if (!preset) return;

    setCadenceMode(preset.mode);
    setDailyPostTarget(String(preset.dailyTarget));
    setWindowsText(preset.windows.join(", "));
  }

  function firstDestinationIdForProject(targetProjectSlug: string): number | null {
    const match = activeDestinations.find((destination) => destination.project_slug === targetProjectSlug);
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
      setFeedback("success", "Destination saved.");
      router.refresh();
    } catch (error) {
      setFeedback("error", error instanceof Error ? error.message : "Could not save destination");
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
      setFeedback("success", "Draft created.");
      router.refresh();
    } catch (error) {
      setFeedback("error", error instanceof Error ? error.message : "Could not create draft");
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

      setFeedback("success", "Draft approved.");
      router.refresh();
    } catch (error) {
      setFeedback("error", error instanceof Error ? error.message : "Could not approve draft");
    } finally {
      setBusy(false);
    }
  }

  async function updateDraftStatus(draftId: number, status: "draft" | "needs_attention" | "rejected" | "archived", successText: string) {
    setBusy(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/drafts/${draftId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? `Request failed (${res.status})`);
      }

      setFeedback("success", successText);
      router.refresh();
    } catch (error) {
      setFeedback("error", error instanceof Error ? error.message : "Could not move draft");
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
          mode: "next_slot",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? `Request failed (${res.status})`);
      }

      setFeedback("success", "Draft queued into the next cadence slot.");
      router.refresh();
    } catch (error) {
      setFeedback("error", error instanceof Error ? error.message : "Could not queue draft");
    } finally {
      setBusy(false);
    }
  }

  const totalDrafts = drafts.length;
  const awaitingApprovalCount = drafts.filter((draft) => draft.status === "draft").length;
  const approvedCount = drafts.filter((draft) => draft.status === "approved").length;
  const activeCount = drafts.filter((draft) => draft.status === "queued" || draft.status === "published").length;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="metric-grid">
        <article className="panel metric-card">
          <span className="metric-label">Active destinations</span>
          <span className="metric-value">{activeDestinations.length}</span>
          <span className="metric-detail">These are the voices currently configured to speak.</span>
        </article>
        <article className="panel metric-card">
          <span className="metric-label">Awaiting approval</span>
          <span className="metric-value">{awaitingApprovalCount}</span>
          <span className="metric-detail">Fresh drafts that still need your blessing.</span>
        </article>
        <article className="panel metric-card">
          <span className="metric-label">Approved</span>
          <span className="metric-value">{approvedCount}</span>
          <span className="metric-detail">Ready to move into the queue.</span>
        </article>
        <article className="panel metric-card">
          <span className="metric-label">Active delivery</span>
          <span className="metric-value">{activeCount}</span>
          <span className="metric-detail">Queued or published posts already moving through the system.</span>
        </article>
      </div>

      {message ? (
        <section className="panel status-note" style={{ borderColor: message.tone === "error" ? "var(--accent)" : "var(--line-strong)" }}>
          <strong>{message.tone === "error" ? "Action blocked" : "Update saved"}</strong>
          <span className="muted">{message.text}</span>
        </section>
      ) : null}

      <div className="grid" style={{ gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <section className="panel">
          <div className="section-head">
            <div>
              <div className="eyebrow">Draft Studio</div>
              <h3>Compose with live preview</h3>
              <small>A draft should feel like a controlled asset before it ever reaches the queue.</small>
            </div>
            <div className="tag-row">
              <span className="tag">{previewProject?.name ?? "Select project"}</span>
              <span className="tag">{previewDestination ? `${previewDestination.platform} · ${previewDestination.name}` : "No destination selected"}</span>
            </div>
          </div>

          <div className="split-panel">
            <form onSubmit={handleCreateDraft} className="grid" style={{ gap: 12 }}>
              <label className="grid" style={{ gap: 6 }}>
                <small>Project</small>
                <select value={projectSlug} onChange={(event) => setProjectSlug(event.target.value)} className="select" disabled={busy}>
                  {projects.map((project) => (
                    <option key={project.slug} value={project.slug}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid" style={{ gap: 6 }}>
                <small>Destination</small>
                <select value={selectedDestinationId} onChange={(event) => setSelectedDestinationId(event.target.value)} className="select" disabled={busy || availableDestinations.length === 0}>
                  {availableDestinations.length === 0 ? <option value="">No destination yet</option> : null}
                  {availableDestinations.map((destination) => (
                    <option key={destination.id} value={destination.id}>
                      {destination.name} · {destination.platform}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid" style={{ gap: 6 }}>
                <small>Title</small>
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What changed?" className="input" disabled={busy} />
              </label>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <label className="grid" style={{ gap: 6, flex: 1, minWidth: 180 }}>
                  <small>Source type</small>
                  <select value={sourceType} onChange={(event) => setSourceType(event.target.value)} className="select" disabled={busy}>
                    <option value="manual">Manual</option>
                    <option value="repo_update">Repo update</option>
                    <option value="evergreen">Evergreen</option>
                    <option value="resurface">Resurface</option>
                    <option value="support">Support</option>
                  </select>
                </label>

                <label className="grid" style={{ gap: 6, flex: 1, minWidth: 180 }}>
                  <small>Kind</small>
                  <select value={kind} onChange={(event) => setKind(event.target.value)} className="select" disabled={busy}>
                    <option value="fresh">Fresh</option>
                    <option value="evergreen">Evergreen</option>
                    <option value="resurface">Resurface</option>
                    <option value="support">Support</option>
                  </select>
                </label>
              </div>

              <label className="grid" style={{ gap: 6 }}>
                <small>Body</small>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Write the post draft here..."
                  rows={10}
                  className="textarea"
                  disabled={busy}
                />
              </label>

              <div className="button-row">
                <button type="submit" className="btn primary" disabled={busy || !title.trim() || !body.trim()}>
                  Save draft
                </button>
                <button type="button" className="btn subtle" disabled={busy} onClick={() => router.refresh()}>
                  Refresh board
                </button>
              </div>
            </form>

            <aside className="preview-card">
              <div className="eyebrow">Live Preview</div>
              <h3>{title.trim() || "Untitled draft"}</h3>
              <div className="tag-row">
                <span className="tag">{previewProject?.name ?? "No project"}</span>
                <span className="tag">{kind}</span>
                <span className="tag">{sourceType}</span>
              </div>
              <div className="preview-body">{body.trim() || "Start typing and the draft preview will come alive here."}</div>
              <div className="grid" style={{ gap: 10 }}>
                <div>
                  <strong>Destination</strong>
                  <div className="muted">{previewDestination ? `${previewDestination.name} on ${previewDestination.platform}` : "Choose or create a destination before queueing."}</div>
                </div>
                <div>
                  <strong>Cadence profile</strong>
                  <div className="muted">
                    {previewDestination
                      ? `${previewDestination.cadence_mode} · ${previewDestination.daily_post_target}/day · ${previewDestination.windows.join(", ")}`
                      : "No cadence profile selected yet."}
                  </div>
                </div>
                <div>
                  <strong>Builder read</strong>
                  <div className="muted">
                    {body.trim()
                      ? "This draft will land in the approval inbox first, then move into the queue only when you say so."
                      : "Draft first, approval second, queue third. That is the operating model now."}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <div>
              <div className="eyebrow">Publishing Map</div>
              <h3>Destinations</h3>
              <small>These are the actual brand voices Pulse is allowed to speak through.</small>
            </div>
            <span className="pill">{activeDestinations.length} active</span>
          </div>

          <form onSubmit={handleCreateDestination} className="grid" style={{ gap: 12, marginBottom: 16 }}>
            <label className="grid" style={{ gap: 6 }}>
              <small>Project</small>
              <select value={destinationProjectSlug} onChange={(event) => setDestinationProjectSlug(event.target.value)} className="select" disabled={busy}>
                {projects.map((project) => (
                  <option key={project.slug} value={project.slug}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <label className="grid" style={{ gap: 6, flex: 1, minWidth: 150 }}>
                <small>Platform</small>
                <select
                  value={destinationPlatform}
                  onChange={(event) => setDestinationPlatform(event.target.value as "facebook" | "x")}
                  className="select"
                  disabled={busy}
                >
                  <option value="facebook">Facebook</option>
                  <option value="x">X</option>
                </select>
              </label>

              <label className="grid" style={{ gap: 6, flex: 2, minWidth: 200 }}>
                <small>Name</small>
                <input
                  value={destinationName}
                  onChange={(event) => setDestinationName(event.target.value)}
                  placeholder="TokenTap Facebook Page"
                  className="input"
                  disabled={busy}
                />
              </label>
            </div>

            <label className="grid" style={{ gap: 6 }}>
              <small>External ref / page ID</small>
              <input
                value={externalRef}
                onChange={(event) => setExternalRef(event.target.value)}
                placeholder="Facebook page ID if you have it"
                className="input"
                disabled={busy}
              />
            </label>

            <div className="grid" style={{ gap: 8 }}>
              <small>Cadence presets</small>
              <div className="tag-row">
                {cadencePresets.map((preset) => (
                  <button key={preset.key} type="button" className="btn subtle" disabled={busy} onClick={() => applyCadencePreset(preset.key)}>
                    {preset.label}
                  </button>
                ))}
              </div>
              <small>These load 5-6 daily windows fast so a project can feel active without hand-entering every slot.</small>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <label className="grid" style={{ gap: 6, flex: 1, minWidth: 160 }}>
                <small>Cadence mode</small>
                <select value={cadenceMode} onChange={(event) => setCadenceMode(event.target.value as Destination["cadence_mode"])} className="select" disabled={busy}>
                  <option value="gentle">Gentle</option>
                  <option value="normal">Normal</option>
                  <option value="aggressive">Aggressive</option>
                  <option value="launch">Launch</option>
                  <option value="quiet">Quiet</option>
                </select>
              </label>

              <label className="grid" style={{ gap: 6, flex: 1, minWidth: 140 }}>
                <small>Daily target</small>
                <input value={dailyPostTarget} onChange={(event) => setDailyPostTarget(event.target.value)} className="input" disabled={busy} />
              </label>
            </div>

            <label className="grid" style={{ gap: 6 }}>
              <small>Preferred windows</small>
              <input value={windowsText} onChange={(event) => setWindowsText(event.target.value)} className="input" disabled={busy} />
            </label>

            <button type="submit" className="btn primary" disabled={busy || !destinationProjectSlug || !destinationName.trim()}>
              Save destination
            </button>
          </form>

          {activeDestinations.length === 0 ? (
            <small>No publishing destinations yet.</small>
          ) : (
            <div className="destination-grid">
              {activeDestinations.map((destination) => (
                <article key={destination.id} className="destination-card">
                  <div className="tag-row" style={{ marginBottom: 10 }}>
                    <span className="tag">{destination.project_slug}</span>
                    <span className="tag">{destination.platform}</span>
                  </div>
                  <h4 style={{ marginBottom: 8 }}>{destination.name}</h4>
                  <div className="muted" style={{ marginBottom: 8 }}>
                    {destination.cadence_mode} cadence · {destination.daily_post_target}/day
                  </div>
                  <div className="muted">{destination.windows.join(", ")}</div>
                  {destination.external_ref ? <small style={{ display: "block", marginTop: 8 }}>Ref: {destination.external_ref}</small> : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">Approval Inbox</div>
            <h3>Manage the draft lanes</h3>
            <small>This is the operating room now: approve, park, reject, restore, and queue without losing the content library.</small>
          </div>
          <span className="pill">{totalDrafts} total drafts</span>
        </div>

        <div className="lane-grid">
          {draftLanes.map((lane) => {
            const laneDrafts = drafts.filter((draft) => lane.statuses.includes(draft.status));

            return (
              <section key={lane.key} className="lane">
                <div className="lane-header">
                  <div>
                    <strong>{lane.title}</strong>
                    <div className="muted" style={{ marginTop: 4 }}>{lane.help}</div>
                  </div>
                  <span className="pill">{laneDrafts.length}</span>
                </div>

                {laneDrafts.length === 0 ? (
                  <small>Nothing in this lane right now.</small>
                ) : (
                  laneDrafts.map((draft) => {
                    const canApprove = ["draft", "needs_attention"].includes(draft.status);
                    const canQueue = draft.status === "approved";
                    const canRestore = ["approved", "needs_attention", "rejected", "archived"].includes(draft.status);
                    const canReject = ["draft", "approved", "needs_attention"].includes(draft.status);
                    const canArchive = !["queued", "published", "archived"].includes(draft.status);
                    const canEscalate = ["draft", "approved"].includes(draft.status);

                    return (
                      <article key={draft.id} className="draft-card">
                        <div className="tag-row">
                          <span className="tag">{draft.project_slug}</span>
                          <span className="tag">{draft.destination_name ?? "No destination"}</span>
                          <span className="tag">{draft.kind}</span>
                        </div>

                        <div>
                          <strong>{draft.title}</strong>
                          <div className="muted" style={{ marginTop: 8 }}>{trimBody(draft.body)}</div>
                        </div>

                        <div className="grid" style={{ gap: 6 }}>
                          <small>Updated {formatWhen(draft.updated_at)}</small>
                          {draft.scheduled_for ? <small>Scheduled for {formatWhen(draft.scheduled_for)}</small> : null}
                          {draft.published_at ? <small>Published {formatWhen(draft.published_at)}</small> : null}
                        </div>

                        <div className="button-row">
                          {canApprove ? (
                            <button type="button" className="btn primary" disabled={busy} onClick={() => approveDraft(draft.id)}>
                              Approve
                            </button>
                          ) : null}
                          {canQueue ? (
                            <button type="button" className="btn primary" disabled={busy} onClick={() => queueDraft(draft)}>
                              Queue next slot
                            </button>
                          ) : null}
                          {canEscalate ? (
                            <button
                              type="button"
                              className="btn subtle"
                              disabled={busy}
                              onClick={() => updateDraftStatus(draft.id, "needs_attention", "Draft moved to needs attention.")}
                            >
                              Needs attention
                            </button>
                          ) : null}
                          {canRestore ? (
                            <button
                              type="button"
                              className="btn subtle"
                              disabled={busy}
                              onClick={() => updateDraftStatus(draft.id, "draft", "Draft restored to working lane.")}
                            >
                              Restore draft
                            </button>
                          ) : null}
                          {canReject ? (
                            <button
                              type="button"
                              className="btn"
                              disabled={busy}
                              onClick={() => updateDraftStatus(draft.id, "rejected", "Draft rejected.")}
                            >
                              Reject
                            </button>
                          ) : null}
                          {canArchive ? (
                            <button
                              type="button"
                              className="btn"
                              disabled={busy}
                              onClick={() => updateDraftStatus(draft.id, "archived", "Draft archived.")}
                            >
                              Archive
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })
                )}
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}
