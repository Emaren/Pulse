"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { Destination, Project, Template } from "@/lib/api";

type ContextDraftPanelProps = {
  projects: Project[];
  templates: Template[];
  destinations: Destination[];
};

type FeedbackTone = "success" | "error";

export function ContextDraftPanel({ projects, templates, destinations }: ContextDraftPanelProps) {
  const router = useRouter();
  const [projectSlug, setProjectSlug] = useState(projects[0]?.slug ?? "");
  const [platform, setPlatform] = useState<Template["platform"]>("facebook");
  const [templateName, setTemplateName] = useState("");
  const [title, setTitle] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [sourceRef, setSourceRef] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: FeedbackTone; text: string } | null>(null);

  const availableTemplates = templates.filter((template) => template.is_active && template.platform === platform);
  const matchingDestination =
    destinations.find((destination) => destination.project_slug === projectSlug && destination.platform === platform && destination.active) ?? null;

  useEffect(() => {
    if (availableTemplates.length === 0) {
      setTemplateName("");
      return;
    }

    const stillValid = availableTemplates.some((template) => template.name === templateName);
    if (!stillValid) {
      setTemplateName(availableTemplates[0].name);
    }
  }, [availableTemplates, templateName]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectSlug || !changeSummary.trim() || !templateName) return;

    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/drafts/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_slug: projectSlug,
          change_summary: changeSummary.trim(),
          title: title.trim() || null,
          platform,
          destination_id: matchingDestination?.id ?? null,
          template_name: templateName,
          auto_approve: autoApprove,
          source_ref: sourceRef.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail ?? `Request failed (${response.status})`);
      }

      setTitle("");
      setChangeSummary("");
      setSourceRef("");
      setAutoApprove(false);
      setMessage({
        tone: "success",
        text: "Context draft created in the inbox. The automated signal bridge now uses this same draft engine under the hood.",
      });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not create context draft" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <div className="eyebrow">Context Intake</div>
          <h2>Observed changes to draft-ready post</h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            This is the operator-side version of the `full-context-all` bridge: another system can now land observations in the new inbox automatically, and this manual panel uses the same renderer when you want to handcraft the signal yourself.
          </p>
        </div>
      </div>

      <div className="tag-row" style={{ marginBottom: 16 }}>
        <span className="tag">observe</span>
        <span className="tag">render</span>
        <span className="tag">review</span>
        <span className="tag">queue later</span>
      </div>

      {message ? (
        <section className="status-note" style={{ marginBottom: 16, border: "1px solid var(--line)", borderRadius: 14, padding: 14 }}>
          <strong>{message.tone === "error" ? "Action blocked" : "Draft created"}</strong>
          <span className="muted">{message.text}</span>
        </section>
      ) : null}

      <form className="grid" style={{ gap: 12 }} onSubmit={handleSubmit}>
        <div className="grid two">
          <label className="grid" style={{ gap: 6 }}>
            <small>Project</small>
            <select className="select" value={projectSlug} onChange={(event) => setProjectSlug(event.target.value)} disabled={busy || projects.length === 0}>
              {projects.map((project) => (
                <option key={project.slug} value={project.slug}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid" style={{ gap: 6 }}>
            <small>Platform</small>
            <select className="select" value={platform} onChange={(event) => setPlatform(event.target.value as Template["platform"])} disabled={busy}>
              <option value="facebook">Facebook</option>
              <option value="x">X</option>
            </select>
          </label>
        </div>

        <div className="grid two">
          <label className="grid" style={{ gap: 6 }}>
            <small>Template</small>
            <select className="select" value={templateName} onChange={(event) => setTemplateName(event.target.value)} disabled={busy || availableTemplates.length === 0}>
              {availableTemplates.length === 0 ? <option value="">No active template</option> : null}
              {availableTemplates.map((template) => (
                <option key={`${template.platform}:${template.name}`} value={template.name}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid" style={{ gap: 6 }}>
            <small>Source ref</small>
            <input
              className="input"
              value={sourceRef}
              onChange={(event) => setSourceRef(event.target.value)}
              placeholder="full-context-all:VPSSentry:2026-03-25"
              disabled={busy}
            />
          </label>
        </div>

        <label className="grid" style={{ gap: 6 }}>
          <small>Draft title override</small>
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Optional. Leave blank and Pulse will derive one."
            disabled={busy}
          />
        </label>

        <label className="grid" style={{ gap: 6 }}>
          <small>What changed?</small>
          <textarea
            className="textarea"
            rows={8}
            value={changeSummary}
            onChange={(event) => setChangeSummary(event.target.value)}
            placeholder="Example: shipped project seeding, added admin CRUD for projects, and queued cadence presets into the studio."
            disabled={busy}
          />
        </label>

        <label className="checkbox-row">
          <input type="checkbox" checked={autoApprove} onChange={(event) => setAutoApprove(event.target.checked)} disabled={busy} />
          <span>Auto-approve the draft on creation when the summary is already trusted</span>
        </label>

        <div className="tag-row">
          <span className="tag">{matchingDestination ? `${matchingDestination.name} ready` : "No destination matched yet"}</span>
          <span className="tag">{templateName || "Pick a template"}</span>
        </div>

        <div className="button-row">
          <button type="submit" className="btn primary" disabled={busy || !projectSlug || !changeSummary.trim() || !templateName}>
            Create context draft
          </button>
          <button type="button" className="btn subtle" onClick={() => router.push("/studio")} disabled={busy}>
            Open approval inbox
          </button>
        </div>
      </form>
    </section>
  );
}
