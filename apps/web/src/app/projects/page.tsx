import { ProjectsWorkspace } from "@/components/ProjectsWorkspace";
import { getDestinations, getDrafts, getProjects, getQueue, type Draft, type Destination, type Project, type QueueItem } from "@/lib/api";

export default async function ProjectsPage() {
  let projects: Project[] = [];
  let destinations: Destination[] = [];
  let drafts: Draft[] = [];
  let queue: QueueItem[] = [];

  try {
    [projects, destinations, drafts, queue] = await Promise.all([getProjects(), getDestinations(), getDrafts(), getQueue()]);
  } catch {
    // Keep the page renderable when the API is unavailable.
  }

  const statsBySlug = Object.fromEntries(
    projects.map((project) => [
      project.slug,
      {
        destinationCount: destinations.filter((destination) => destination.project_slug === project.slug).length,
        draftCount: drafts.filter((draft) => draft.project_slug === project.slug).length,
        queueCount: queue.filter((item) => item.payload?.project_slug === project.slug).length,
      },
    ]),
  );

  return (
    <ProjectsWorkspace initialProjects={projects} statsBySlug={statsBySlug} />
  );
}
