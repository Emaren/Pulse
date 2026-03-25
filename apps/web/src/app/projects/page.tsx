import { ProjectCard } from "@/components/ProjectCard";
import { getProjects, type Project } from "@/lib/api";

export default async function ProjectsPage() {
  let projects: Project[] = [];

  try {
    projects = await getProjects();
  } catch {
    // Keep the page renderable when the API is unavailable.
  }

  return (
    <section>
      <h2>Projects</h2>
      <p style={{ marginTop: 0, marginBottom: 16 }}>
        These are the project identities Pulse already knows how to speak for.
      </p>
      <div className="grid two">
        {projects.map((project) => (
          <ProjectCard key={project.slug} name={project.name} tone={project.tone} url={project.website_url} active={project.active} />
        ))}
      </div>
      {projects.length === 0 ? <small>No live projects found yet. Seed them through the API first.</small> : null}
    </section>
  );
}
