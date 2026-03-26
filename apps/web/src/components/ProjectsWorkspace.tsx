"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { Project } from "@/lib/api";

type ProjectStats = {
  destinationCount: number;
  draftCount: number;
  queueCount: number;
};

type ProjectsWorkspaceProps = {
  initialProjects: Project[];
  statsBySlug: Record<string, ProjectStats>;
};

type EditableProject = Project & {
  tagsText: string;
};

type ProjectDraft = {
  name: string;
  slug: string;
  website_url: string;
  tone: string;
  tagsText: string;
  active: boolean;
};

type FeedbackTone = "success" | "error";

function toEditable(project: Project): EditableProject {
  return {
    ...project,
    tagsText: project.tags.join(", "),
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ProjectsWorkspace({ initialProjects, statsBySlug }: ProjectsWorkspaceProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<EditableProject[]>(() => initialProjects.map(toEditable));
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: FeedbackTone; text: string } | null>(null);
  const [newProject, setNewProject] = useState<ProjectDraft>({
    name: "",
    slug: "",
    website_url: "",
    tone: "neutral",
    tagsText: "",
    active: true,
  });

  useEffect(() => {
    setProjects(initialProjects.map(toEditable));
  }, [initialProjects]);

  const activeCount = initialProjects.filter((project) => project.active).length;
  const readyCount = initialProjects.filter((project) => (statsBySlug[project.slug]?.destinationCount ?? 0) > 0).length;
  const needsSetupCount = initialProjects.filter((project) => project.active && (statsBySlug[project.slug]?.destinationCount ?? 0) === 0).length;
  const safeDeleteCount = initialProjects.filter((project) => {
    const stats = statsBySlug[project.slug] ?? { destinationCount: 0, draftCount: 0, queueCount: 0 };
    return stats.destinationCount + stats.draftCount + stats.queueCount === 0;
  }).length;

  function updateProjectDraft(slug: string, field: keyof EditableProject, value: string | boolean) {
    setProjects((current) =>
      current.map((project) =>
        project.slug === slug
          ? {
              ...project,
              [field]: value,
            }
          : project,
      ),
    );
  }

  async function handleSeedCatalog() {
    setBusyKey("seed");
    setMessage(null);

    try {
      const response = await fetch("/api/projects/seed", { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail ?? `Request failed (${response.status})`);
      }

      setMessage({ tone: "success", text: "Starter project catalog restored." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not reseed projects" });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newProject.name.trim() || !newProject.slug.trim() || !newProject.website_url.trim()) return;

    setBusyKey("create");
    setMessage(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slugify(newProject.slug),
          name: newProject.name.trim(),
          website_url: newProject.website_url.trim(),
          tone: newProject.tone.trim() || "neutral",
          tags: parseTags(newProject.tagsText),
          active: newProject.active,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail ?? `Request failed (${response.status})`);
      }

      setNewProject({
        name: "",
        slug: "",
        website_url: "",
        tone: "neutral",
        tagsText: "",
        active: true,
      });
      setMessage({ tone: "success", text: "Project created." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not create project" });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSaveProject(project: EditableProject) {
    setBusyKey(`save:${project.slug}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${project.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: project.name.trim(),
          website_url: project.website_url.trim(),
          tone: project.tone.trim() || "neutral",
          tags: parseTags(project.tagsText),
          active: project.active,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail ?? `Request failed (${response.status})`);
      }

      setMessage({ tone: "success", text: `${project.name} saved.` });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not save project" });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDeleteProject(project: EditableProject) {
    const stats = statsBySlug[project.slug] ?? { destinationCount: 0, draftCount: 0, queueCount: 0 };
    if (stats.destinationCount + stats.draftCount + stats.queueCount > 0) {
      setMessage({
        tone: "error",
        text: `Delete is blocked for ${project.name} because Pulse already has history attached. Pause it instead.`,
      });
      return;
    }

    if (!window.confirm(`Delete ${project.name}? This only makes sense for brand-new unused projects.`)) {
      return;
    }

    setBusyKey(`delete:${project.slug}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${project.slug}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail ?? `Request failed (${response.status})`);
      }

      setMessage({ tone: "success", text: `${project.name} deleted.` });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not delete project" });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="grid" style={{ gap: 16 }}>
      <section className="panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">Project Catalog</div>
            <h2>Pulse knows your project roster now</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              In plain English: this is the identity library. If a project lives here, Pulse can draft for it, map destinations to it, and keep its social voice organized.
            </p>
          </div>
          <div className="button-row">
            <button type="button" className="btn subtle" onClick={handleSeedCatalog} disabled={busyKey !== null}>
              Restore starter catalog
            </button>
          </div>
        </div>

        <div className="metric-grid">
          <article className="destination-card">
            <div className="metric-label">Projects</div>
            <div className="metric-value">{initialProjects.length}</div>
            <div className="metric-detail">{activeCount} currently active.</div>
          </article>
          <article className="destination-card">
            <div className="metric-label">Voice-ready</div>
            <div className="metric-value">{readyCount}</div>
            <div className="metric-detail">Projects with at least one live destination.</div>
          </article>
          <article className="destination-card">
            <div className="metric-label">Needs setup</div>
            <div className="metric-value">{needsSetupCount}</div>
            <div className="metric-detail">Active projects still waiting for their first publishing voice.</div>
          </article>
          <article className="destination-card">
            <div className="metric-label">Safe delete</div>
            <div className="metric-value">{safeDeleteCount}</div>
            <div className="metric-detail">Unused records that can be removed without breaking history.</div>
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
            <div className="eyebrow">New Project</div>
            <h3>Add a new project without leaving Pulse</h3>
          </div>
        </div>

        <form className="grid two" onSubmit={handleCreateProject}>
          <label className="grid" style={{ gap: 6 }}>
            <small>Name</small>
            <input
              className="input"
              value={newProject.name}
              onChange={(event) =>
                setNewProject((current) => ({
                  ...current,
                  name: event.target.value,
                  slug: current.slug ? current.slug : slugify(event.target.value),
                }))
              }
              placeholder="Pulse, TokenTap, WheatAndStone..."
              disabled={busyKey !== null}
            />
          </label>

          <label className="grid" style={{ gap: 6 }}>
            <small>Slug</small>
            <input
              className="input"
              value={newProject.slug}
              onChange={(event) => setNewProject((current) => ({ ...current, slug: slugify(event.target.value) }))}
              placeholder="pulse"
              disabled={busyKey !== null}
            />
          </label>

          <label className="grid" style={{ gap: 6 }}>
            <small>Website URL</small>
            <input
              className="input"
              value={newProject.website_url}
              onChange={(event) => setNewProject((current) => ({ ...current, website_url: event.target.value }))}
              placeholder="https://example.com"
              disabled={busyKey !== null}
            />
          </label>

          <label className="grid" style={{ gap: 6 }}>
            <small>Tone</small>
            <input
              className="input"
              value={newProject.tone}
              onChange={(event) => setNewProject((current) => ({ ...current, tone: event.target.value }))}
              placeholder="energetic, direct, practical..."
              disabled={busyKey !== null}
            />
          </label>

          <label className="grid" style={{ gap: 6 }}>
            <small>Tags</small>
            <input
              className="input"
              value={newProject.tagsText}
              onChange={(event) => setNewProject((current) => ({ ...current, tagsText: event.target.value }))}
              placeholder="campaigns, community, growth"
              disabled={busyKey !== null}
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={newProject.active}
              onChange={(event) => setNewProject((current) => ({ ...current, active: event.target.checked }))}
              disabled={busyKey !== null}
            />
            <span>Project should be live immediately</span>
          </label>

          <div className="button-row">
            <button
              type="submit"
              className="btn primary"
              disabled={busyKey !== null || !newProject.name.trim() || !newProject.slug.trim() || !newProject.website_url.trim()}
            >
              Add project
            </button>
          </div>
        </form>
      </section>

      <section className="project-grid">
        {projects.map((project) => {
          const stats = statsBySlug[project.slug] ?? { destinationCount: 0, draftCount: 0, queueCount: 0 };
          const hasHistory = stats.destinationCount + stats.draftCount + stats.queueCount > 0;

          return (
            <article key={project.slug} className="panel project-admin-card">
              <div className="section-head">
                <div>
                  <div className="eyebrow">Project Identity</div>
                  <h3>{project.name}</h3>
                  <div className="tag-row">
                    <span className="tag">{project.slug}</span>
                    <span className="tag">{project.active ? "active" : "paused"}</span>
                    <span className="tag">{project.tone}</span>
                  </div>
                </div>
                <div className="project-meta">
                  <span className="pill">{stats.destinationCount} destinations</span>
                  <span className="pill">{stats.draftCount} drafts</span>
                  <span className="pill">{stats.queueCount} queue items</span>
                </div>
              </div>

              <div className="grid two">
                <label className="grid" style={{ gap: 6 }}>
                  <small>Name</small>
                  <input
                    className="input"
                    value={project.name}
                    onChange={(event) => updateProjectDraft(project.slug, "name", event.target.value)}
                    disabled={busyKey !== null}
                  />
                </label>

                <label className="grid" style={{ gap: 6 }}>
                  <small>Tone</small>
                  <input
                    className="input"
                    value={project.tone}
                    onChange={(event) => updateProjectDraft(project.slug, "tone", event.target.value)}
                    disabled={busyKey !== null}
                  />
                </label>

                <label className="grid" style={{ gap: 6 }}>
                  <small>Website URL</small>
                  <input
                    className="input"
                    value={project.website_url}
                    onChange={(event) => updateProjectDraft(project.slug, "website_url", event.target.value)}
                    disabled={busyKey !== null}
                  />
                </label>

                <label className="grid" style={{ gap: 6 }}>
                  <small>Tags</small>
                  <input
                    className="input"
                    value={project.tagsText}
                    onChange={(event) => updateProjectDraft(project.slug, "tagsText", event.target.value)}
                    disabled={busyKey !== null}
                  />
                </label>
              </div>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={project.active}
                  onChange={(event) => updateProjectDraft(project.slug, "active", event.target.checked)}
                  disabled={busyKey !== null}
                />
                <span>Project is active for drafting and destination assignment</span>
              </label>

              <div className="button-row">
                <button type="button" className="btn primary" onClick={() => handleSaveProject(project)} disabled={busyKey !== null}>
                  Save changes
                </button>
                <button type="button" className="btn subtle" onClick={() => router.push("/studio")}>
                  Open Studio
                </button>
                <button type="button" className="btn danger" onClick={() => handleDeleteProject(project)} disabled={busyKey !== null || hasHistory}>
                  Delete project
                </button>
              </div>

              <small>
                {hasHistory
                  ? "Delete stays locked once a project has destinations, drafts, or queue history. That protects campaign intent and keeps Pulse honest."
                  : "This project is still clean enough to remove if it was created by mistake."}
              </small>
            </article>
          );
        })}
      </section>
    </section>
  );
}
