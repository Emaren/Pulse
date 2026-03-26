import Link from "next/link";

import { CadenceAutomationPanel } from "@/components/CadenceAutomationPanel";
import { ContextDraftPanel } from "@/components/ContextDraftPanel";
import { QueueTable, type QueueItem } from "@/components/QueueTable";
import { SignalInboxPanel } from "@/components/SignalInboxPanel";
import { cadencePresets } from "@/lib/cadence-presets";
import { getAutomationSettings, getCadencePreview, getDestinations, getDrafts, getHealth, getProjects, getQueue, getSignals, getTemplates, type AutomationSettings, type CadencePreview, type ContextSignal, type Destination, type Draft, type Project, type Template } from "@/lib/api";
import { builderStatus } from "@/lib/builder-status";

export default async function DashboardPage() {
  let status = "offline";
  let queue: QueueItem[] = [];
  let drafts: Draft[] = [];
  let destinations: Destination[] = [];
  let projects: Project[] = [];
  let templates: Template[] = [];
  let cadencePreview: CadencePreview[] = [];
  let signals: ContextSignal[] = [];
  let automationSettings: AutomationSettings = {
    cadence_enabled: false,
    cadence_interval_minutes: 30,
    cadence_run_limit: 6,
    quiet_hours: [],
    last_cadence_run_at: null,
  };
  let destinationCount = 0;
  let draftCount = 0;
  let approvalCount = 0;
  let queuedDraftCount = 0;

  try {
    const health = await getHealth();
    status = health.status;
    const [loadedQueue, loadedProjects, loadedTemplates, loadedDestinations, loadedDrafts, loadedCadencePreview, loadedAutomationSettings, loadedSignals] = await Promise.all([
      getQueue(),
      getProjects(),
      getTemplates(),
      getDestinations(),
      getDrafts(),
      getCadencePreview(),
      getAutomationSettings(),
      getSignals(),
    ]);
    queue = loadedQueue as QueueItem[];
    projects = loadedProjects;
    templates = loadedTemplates;
    destinations = loadedDestinations;
    cadencePreview = loadedCadencePreview;
    automationSettings = loadedAutomationSettings;
    signals = loadedSignals;
    destinationCount = destinations.length;
    drafts = loadedDrafts;
    draftCount = drafts.length;
    approvalCount = drafts.filter((draft) => draft.status === "approved").length;
    queuedDraftCount = drafts.filter((draft) => draft.status === "queued").length;
  } catch {
    // Keep page renderable even when API is down.
  }

  const draftStats = [
    {
      label: "Awaiting review",
      value: drafts.filter((draft) => draft.status === "draft").length,
      detail: "New drafts still waiting for your eyes.",
    },
    {
      label: "Needs attention",
      value: drafts.filter((draft) => draft.status === "needs_attention").length,
      detail: "Posts blocked for cleanup or a stronger human pass.",
    },
    {
      label: "Approved",
      value: approvalCount,
      detail: "Ready to move into the real queue.",
    },
    {
      label: "Published",
      value: drafts.filter((draft) => draft.status === "published").length,
      detail: "Already pushed through the delivery lane.",
    },
  ];

  const recentDrafts = drafts.slice(0, 4);
  const activeTemplateCount = templates.filter((template) => template.is_active).length;
  const voiceReadyProjects = projects.filter((project) => destinations.some((destination) => destination.project_slug === project.slug && destination.active)).length;
  const cadenceReadyDestinations = destinations.filter((destination) => destination.active && destination.windows.length >= 5).length;
  const evergreenBankDrafts = drafts.filter((draft) => draft.notes?.generator === "content_bank");
  const approvedEvergreenBankDrafts = evergreenBankDrafts.filter((draft) => draft.status === "approved");
  const freshSignalDrafts = drafts.filter((draft) => draft.source_type === "repo_update");
  const projectSummaries = projects.map((project) => ({
    ...project,
    destinationCount: destinations.filter((destination) => destination.project_slug === project.slug).length,
    draftCount: drafts.filter((draft) => draft.project_slug === project.slug).length,
    contentBankCount: evergreenBankDrafts.filter((draft) => draft.project_slug === project.slug).length,
  }));

  return (
    <section className="grid" style={{ gap: 16 }}>
      <section className="panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">Admin Command Deck</div>
            <h2>Pulse is acting more like the real control tower now</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              In plain English: the system now knows your projects, keeps a reusable template library, can accept trusted observations into a real inbox, turns them into approval-ready drafts, and now chooses between fresh and evergreen content more deliberately when cadence runs.
            </p>
          </div>
          <div className="quick-links">
            <Link href="/studio" className="btn-link primary">
              Open Studio
            </Link>
            <Link href="/projects" className="btn-link subtle">
              Manage Projects
            </Link>
            <Link href="/queue" className="btn-link subtle">
              Open Queue
            </Link>
            <Link href="/templates" className="btn-link">
              Open Library
            </Link>
          </div>
        </div>

        <div className="metric-grid">
          <article className="metric-card">
            <span className="metric-label">Builder version</span>
            <span className="metric-value">
              {builderStatus.overall.toFixed(2)} / {builderStatus.target.toFixed(2)}
            </span>
            <span className="metric-detail">{builderStatus.stageLabel}</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">System status</span>
            <span className="metric-value">{status}</span>
            <span className="metric-detail">The execution lane is still alive while the control tower grows around it.</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">Destinations</span>
            <span className="metric-value">{destinationCount}</span>
            <span className="metric-detail">Publishing identities currently configured.</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">Draft library</span>
            <span className="metric-value">{draftCount}</span>
            <span className="metric-detail">{approvalCount} approved and {queuedDraftCount} already queued.</span>
          </article>
        </div>
      </section>

      <div className="grid two">
        <section className="panel">
          <div className="section-head">
            <div>
              <div className="eyebrow">Coverage</div>
              <h2>Admin readiness snapshot</h2>
            </div>
            <span className="pill">{projects.length} projects loaded</span>
          </div>
          <div className="metric-grid">
            <article className="destination-card">
              <div className="metric-label">Voice-ready projects</div>
              <div className="metric-value">{voiceReadyProjects}</div>
              <div className="metric-detail">Projects with at least one active destination already attached.</div>
            </article>
            <article className="destination-card">
              <div className="metric-label">Active templates</div>
              <div className="metric-value">{activeTemplateCount}</div>
              <div className="metric-detail">Reusable copy frames available to the context intake and signal bridge.</div>
            </article>
            <article className="destination-card">
              <div className="metric-label">Cadence-ready destinations</div>
              <div className="metric-value">{cadenceReadyDestinations}</div>
              <div className="metric-detail">Destinations already holding 5+ daily windows.</div>
            </article>
            <article className="destination-card">
              <div className="metric-label">Approval backlog</div>
              <div className="metric-value">{draftStats[0]?.value ?? 0}</div>
              <div className="metric-detail">Fresh items still waiting for your blessing.</div>
            </article>
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <div>
              <div className="eyebrow">Cadence Engine</div>
              <h2>Preset posting rhythms</h2>
            </div>
            <span className="pill">{cadencePresets.length} ready-made profiles</span>
          </div>
          <div className="preset-grid">
            {cadencePresets.map((preset) => (
              <article key={preset.key} className="preset-card">
                <div className="tag-row" style={{ marginBottom: 8 }}>
                  <span className="tag">{preset.label}</span>
                  <span className="tag">{preset.dailyTarget}/day</span>
                </div>
                <strong>{preset.windows.join(" · ")}</strong>
                <div className="muted" style={{ marginTop: 8 }}>{preset.detail}</div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">Always-Alive Engine</div>
            <h2>How much evergreen fuel Pulse has on the shelf</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              In plain English: this is the backup stock. When there is no fresh observation yet, Pulse can still pull from these prebuilt evergreen drafts so a project does not go quiet and look abandoned.
            </p>
          </div>
          <Link href="/templates" className="btn-link">
            Stock the library
          </Link>
        </div>

        <div className="metric-grid">
          <article className="destination-card">
            <div className="metric-label">Evergreen bank drafts</div>
            <div className="metric-value">{evergreenBankDrafts.length}</div>
            <div className="metric-detail">Reusable drafts generated from the shared playbooks and your project metadata.</div>
          </article>
          <article className="destination-card">
            <div className="metric-label">Autopilot-ready bank</div>
            <div className="metric-value">{approvedEvergreenBankDrafts.length}</div>
            <div className="metric-detail">Evergreen stock already approved and safe for cadence or autopilot to use.</div>
          </article>
          <article className="destination-card">
            <div className="metric-label">Fresh observation drafts</div>
            <div className="metric-value">{freshSignalDrafts.length}</div>
            <div className="metric-detail">Repo or context-driven drafts generated from what the system noticed changing.</div>
          </article>
          <article className="destination-card">
            <div className="metric-label">Projects with shelf stock</div>
            <div className="metric-value">{projectSummaries.filter((project) => project.contentBankCount > 0).length}</div>
            <div className="metric-detail">Projects that already have evergreen backup content in reserve.</div>
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">Project Radar</div>
            <h2>Which projects are setup and which still need voice wiring</h2>
          </div>
          <Link href="/projects" className="btn-link">
            Open Projects
          </Link>
        </div>

        <div className="project-grid">
          {projectSummaries.length === 0 ? (
            <small>No projects loaded yet. The startup seed should fill this on the next healthy API boot.</small>
          ) : (
            projectSummaries.map((project) => (
              <article key={project.slug} className="panel project-admin-card">
                <div className="tag-row" style={{ marginBottom: 10 }}>
                  <span className="tag">{project.slug}</span>
                  <span className="tag">{project.active ? "active" : "paused"}</span>
                  <span className="tag">{project.tone}</span>
                </div>
                <h3 style={{ marginTop: 0 }}>{project.name}</h3>
                <div className="muted" style={{ marginBottom: 12 }}>{project.website_url}</div>
                <div className="project-meta">
                  <span className="pill">{project.destinationCount} destinations</span>
                  <span className="pill">{project.draftCount} drafts</span>
                  <span className="pill">{project.contentBankCount} banked</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <div className="grid two">
        <ContextDraftPanel projects={projects} templates={templates} destinations={destinations} />
        <CadenceAutomationPanel initialPreview={cadencePreview} settings={automationSettings} />
      </div>

      <SignalInboxPanel initialSignals={signals} />

      <section className="panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">Recent Drafts</div>
            <h2>Newest activity</h2>
          </div>
          <Link href="/studio" className="btn-link">
            Manage Inbox
          </Link>
        </div>
        {recentDrafts.length === 0 ? (
          <small>No drafts yet. The Studio page is ready for the first destination and draft.</small>
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            {recentDrafts.map((draft) => (
              <article key={draft.id} className="draft-card">
                <div className="tag-row">
                  <span className="tag">{draft.project_slug}</span>
                  <span className="tag">{draft.status}</span>
                </div>
                <strong>{draft.title}</strong>
                <div className="muted">{draft.body.length > 180 ? `${draft.body.slice(0, 179)}…` : draft.body}</div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">Module Progress</div>
            <h2>How close each layer is to the target</h2>
          </div>
        </div>
        <div className="grid two">
          {builderStatus.modules.map((module) => (
            <article key={module.label} className="panel">
              <h3>{module.label}</h3>
              <p style={{ marginBottom: 6 }}>
                <strong>{module.score.toFixed(2)} / 1.00</strong>
              </p>
              <small>{module.detail}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">Execution Lane</div>
            <h2>Queue Snapshot</h2>
          </div>
        </div>
        <QueueTable items={queue} />
      </section>
    </section>
  );
}
