"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { ContentBankSeedResult, Destination, Project, Template } from "@/lib/api";
import { cadencePresets } from "@/lib/cadence-presets";

type TemplateLibraryProps = {
  initialTemplates: Template[];
  destinations: Destination[];
  projects: Project[];
};

type EditableTemplate = Template;

type TemplateDraft = {
  platform: Template["platform"];
  name: string;
  body: string;
  is_active: boolean;
};

type FeedbackTone = "success" | "error";

export function TemplateLibrary({ initialTemplates, destinations, projects }: TemplateLibraryProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<EditableTemplate[]>(initialTemplates);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: FeedbackTone; text: string } | null>(null);
  const [contentBankProject, setContentBankProject] = useState("all");
  const [contentBankPlatform, setContentBankPlatform] = useState<"all" | Template["platform"]>("all");
  const [contentBankAutoApprove, setContentBankAutoApprove] = useState(true);
  const [contentBankLimit, setContentBankLimit] = useState("4");
  const [newTemplate, setNewTemplate] = useState<TemplateDraft>({
    platform: "facebook",
    name: "",
    body: "",
    is_active: true,
  });

  useEffect(() => {
    setTemplates(initialTemplates);
  }, [initialTemplates]);

  const activeTemplates = initialTemplates.filter((template) => template.is_active);
  const cadenceReadyCount = destinations.filter((destination) => destination.active && destination.windows.length >= 5).length;
  const facebookCount = activeTemplates.filter((template) => template.platform === "facebook").length;
  const xCount = activeTemplates.filter((template) => template.platform === "x").length;

  async function handleSeedContentBank() {
    setBusyKey("content-bank");
    setMessage(null);

    try {
      const platforms = contentBankPlatform === "all" ? ["facebook", "x"] : [contentBankPlatform];
      const response = await fetch("/api/automation/content-bank/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_slug: contentBankProject === "all" ? null : contentBankProject,
          platforms,
          auto_approve: contentBankAutoApprove,
          limit_per_project: Number(contentBankLimit || 4),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail ?? `Request failed (${response.status})`);
      }

      const result = (await response.json()) as ContentBankSeedResult;
      setMessage({
        tone: "success",
        text:
          result.created_count > 0
            ? `Seeded ${result.created_count} evergreen bank draft${result.created_count === 1 ? "" : "s"} across the selected voice lanes.`
            : "Content bank already stocked for the current selection.",
      });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not seed content bank" });
    } finally {
      setBusyKey(null);
    }
  }

  function updateTemplateDraft(templateId: number, field: keyof EditableTemplate, value: string | boolean) {
    setTemplates((current) =>
      current.map((template) =>
        template.id === templateId
          ? {
              ...template,
              [field]: value,
            }
          : template,
      ),
    );
  }

  async function handleSeedLibrary() {
    setBusyKey("seed");
    setMessage(null);

    try {
      const response = await fetch("/api/templates/seed", { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail ?? `Request failed (${response.status})`);
      }

      setMessage({ tone: "success", text: "Starter template library restored." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not reseed templates" });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCreateTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newTemplate.name.trim() || !newTemplate.body.trim()) return;

    setBusyKey("create");
    setMessage(null);

    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: newTemplate.platform,
          name: newTemplate.name.trim(),
          body: newTemplate.body.trim(),
          is_active: newTemplate.is_active,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail ?? `Request failed (${response.status})`);
      }

      setNewTemplate({
        platform: "facebook",
        name: "",
        body: "",
        is_active: true,
      });
      setMessage({ tone: "success", text: "Template created." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not create template" });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSaveTemplate(template: EditableTemplate) {
    setBusyKey(`save:${template.id}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: template.platform,
          name: template.name.trim(),
          body: template.body.trim(),
          is_active: template.is_active,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail ?? `Request failed (${response.status})`);
      }

      setMessage({ tone: "success", text: `${template.platform}/${template.name} saved.` });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not save template" });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDeleteTemplate(template: EditableTemplate) {
    if (!window.confirm(`Delete template ${template.platform}/${template.name}?`)) {
      return;
    }

    setBusyKey(`delete:${template.id}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/templates/${template.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail ?? `Request failed (${response.status})`);
      }

      setMessage({ tone: "success", text: `${template.platform}/${template.name} deleted.` });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not delete template" });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="grid" style={{ gap: 16 }}>
      <section className="panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">Template Library</div>
            <h2>Reusable copy patterns for the always-alive engine</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              This is where we keep the reusable voice skeletons. The context intake flow drops fresh observations into these shells so you get draftable content instead of empty queue slots.
            </p>
          </div>
          <div className="button-row">
            <button type="button" className="btn subtle" onClick={handleSeedLibrary} disabled={busyKey !== null}>
              Restore starter library
            </button>
          </div>
        </div>

        <div className="metric-grid">
          <article className="destination-card">
            <div className="metric-label">Active templates</div>
            <div className="metric-value">{activeTemplates.length}</div>
            <div className="metric-detail">Reusable copy patterns currently turned on.</div>
          </article>
          <article className="destination-card">
            <div className="metric-label">Facebook</div>
            <div className="metric-value">{facebookCount}</div>
            <div className="metric-detail">Templates ready for longer-form posts.</div>
          </article>
          <article className="destination-card">
            <div className="metric-label">X</div>
            <div className="metric-value">{xCount}</div>
            <div className="metric-detail">Templates ready for compact updates.</div>
          </article>
          <article className="destination-card">
            <div className="metric-label">Cadence-ready voices</div>
            <div className="metric-value">{cadenceReadyCount}</div>
            <div className="metric-detail">Destinations already holding 5+ windows for a living pulse.</div>
          </article>
        </div>
      </section>

      {message ? (
        <section className="panel status-note" style={{ borderColor: message.tone === "error" ? "var(--accent)" : "var(--line-strong)" }}>
          <strong>{message.tone === "error" ? "Action blocked" : "Update saved"}</strong>
          <span className="muted">{message.text}</span>
        </section>
      ) : null}

      <section className="panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">Cadence Presets</div>
            <h3>5-6 time windows that keep projects feeling alive</h3>
          </div>
        </div>

        <div className="preset-grid">
          {cadencePresets.map((preset) => (
            <article key={preset.key} className="preset-card">
              <div className="tag-row" style={{ marginBottom: 8 }}>
                <span className="tag">{preset.label}</span>
                <span className="tag">{preset.mode}</span>
                <span className="tag">{preset.dailyTarget}/day</span>
              </div>
              <strong>{preset.windows.join(" · ")}</strong>
              <div className="muted" style={{ marginTop: 8 }}>{preset.detail}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">Content Bank</div>
            <h3>Seed evergreen drafts from the library</h3>
            <p className="muted" style={{ marginBottom: 0 }}>
              This is the shelf-stocking move. Pulse uses the shared playbooks plus your project metadata to create evergreen and resurfaced drafts so the cadence engine has something safe to work with between fresh observations.
            </p>
          </div>
        </div>

        <div className="grid two" style={{ marginBottom: 12 }}>
          <label className="grid" style={{ gap: 6 }}>
            <small>Project scope</small>
            <select className="select" value={contentBankProject} onChange={(event) => setContentBankProject(event.target.value)} disabled={busyKey !== null}>
              <option value="all">All active projects</option>
              {projects.map((project) => (
                <option key={project.slug} value={project.slug}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid" style={{ gap: 6 }}>
            <small>Platform scope</small>
            <select
              className="select"
              value={contentBankPlatform}
              onChange={(event) => setContentBankPlatform(event.target.value as "all" | Template["platform"])}
              disabled={busyKey !== null}
            >
              <option value="all">Facebook + X</option>
              <option value="facebook">Facebook only</option>
              <option value="x">X only</option>
            </select>
          </label>
        </div>

        <div className="grid two" style={{ marginBottom: 12 }}>
          <label className="grid" style={{ gap: 6 }}>
            <small>Max new drafts per project</small>
            <input
              className="input"
              type="number"
              min={1}
              max={12}
              value={contentBankLimit}
              onChange={(event) => setContentBankLimit(event.target.value)}
              disabled={busyKey !== null}
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={contentBankAutoApprove}
              onChange={(event) => setContentBankAutoApprove(event.target.checked)}
              disabled={busyKey !== null}
            />
            <span>Auto-approve seeded drafts so autopilot can use them immediately</span>
          </label>
        </div>

        <div className="button-row">
          <button type="button" className="btn primary" onClick={handleSeedContentBank} disabled={busyKey !== null}>
            Seed evergreen bank
          </button>
        </div>
        <small className="muted">
          Pulse spreads the requested draft count across the selected platforms so one voice does not hog the whole shelf.
        </small>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">New Template</div>
            <h3>Add another library pattern</h3>
          </div>
        </div>

        <form className="grid" style={{ gap: 12 }} onSubmit={handleCreateTemplate}>
          <div className="grid two">
            <label className="grid" style={{ gap: 6 }}>
              <small>Platform</small>
              <select
                className="select"
                value={newTemplate.platform}
                onChange={(event) =>
                  setNewTemplate((current) => ({ ...current, platform: event.target.value as Template["platform"] }))
                }
                disabled={busyKey !== null}
              >
                <option value="facebook">Facebook</option>
                <option value="x">X</option>
              </select>
            </label>

            <label className="grid" style={{ gap: 6 }}>
              <small>Name</small>
              <input
                className="input"
                value={newTemplate.name}
                onChange={(event) => setNewTemplate((current) => ({ ...current, name: event.target.value }))}
                placeholder="default, milestone, launch..."
                disabled={busyKey !== null}
              />
            </label>
          </div>

          <label className="grid" style={{ gap: 6 }}>
            <small>Template body</small>
            <textarea
              className="textarea"
              rows={8}
              value={newTemplate.body}
              onChange={(event) => setNewTemplate((current) => ({ ...current, body: event.target.value }))}
              placeholder={"Update from {project_name}:\n{update}\n\nDetails: {url}"}
              disabled={busyKey !== null}
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={newTemplate.is_active}
              onChange={(event) => setNewTemplate((current) => ({ ...current, is_active: event.target.checked }))}
              disabled={busyKey !== null}
            />
            <span>Template is active and available to the context draft generator</span>
          </label>

          <div className="tag-row">
            <span className="tag">{"{project_name}"}</span>
            <span className="tag">{"{update}"}</span>
            <span className="tag">{"{url}"}</span>
            <span className="tag">{"{tag1}"}</span>
            <span className="tag">{"{tag2}"}</span>
          </div>

          <div className="button-row">
            <button type="submit" className="btn primary" disabled={busyKey !== null || !newTemplate.name.trim() || !newTemplate.body.trim()}>
              Add template
            </button>
          </div>
        </form>
      </section>

      <section className="template-grid">
        {templates.map((template) => (
          <article key={template.id} className="panel library-card">
            <div className="section-head">
              <div>
                <div className="eyebrow">Library Entry</div>
                <h3>
                  {template.platform}/{template.name}
                </h3>
              </div>
              <div className="tag-row">
                <span className="tag">{template.platform}</span>
                <span className="tag">{template.is_active ? "active" : "inactive"}</span>
              </div>
            </div>

            <div className="grid" style={{ gap: 12 }}>
              <div className="grid two">
                <label className="grid" style={{ gap: 6 }}>
                  <small>Platform</small>
                  <select
                    className="select"
                    value={template.platform}
                    onChange={(event) => updateTemplateDraft(template.id, "platform", event.target.value as Template["platform"])}
                    disabled={busyKey !== null}
                  >
                    <option value="facebook">Facebook</option>
                    <option value="x">X</option>
                  </select>
                </label>

                <label className="grid" style={{ gap: 6 }}>
                  <small>Name</small>
                  <input
                    className="input"
                    value={template.name}
                    onChange={(event) => updateTemplateDraft(template.id, "name", event.target.value)}
                    disabled={busyKey !== null}
                  />
                </label>
              </div>

              <label className="grid" style={{ gap: 6 }}>
                <small>Body</small>
                <textarea
                  className="textarea"
                  rows={8}
                  value={template.body}
                  onChange={(event) => updateTemplateDraft(template.id, "body", event.target.value)}
                  disabled={busyKey !== null}
                />
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={template.is_active}
                  onChange={(event) => updateTemplateDraft(template.id, "is_active", event.target.checked)}
                  disabled={busyKey !== null}
                />
                <span>Template can be used by manual drafting and context intake</span>
              </label>

              <div className="button-row">
                <button type="button" className="btn primary" onClick={() => handleSaveTemplate(template)} disabled={busyKey !== null}>
                  Save template
                </button>
                <button type="button" className="btn danger" onClick={() => handleDeleteTemplate(template)} disabled={busyKey !== null}>
                  Delete template
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}
