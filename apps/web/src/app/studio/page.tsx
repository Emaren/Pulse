import { PostStudio } from "@/components/PostStudio";
import { getDestinations, getDrafts, getProjects, type Destination, type Draft, type Project } from "@/lib/api";

export default async function StudioPage() {
  let projects: Project[] = [];
  let destinations: Destination[] = [];
  let drafts: Draft[] = [];

  try {
    [projects, destinations, drafts] = await Promise.all([getProjects(), getDestinations(), getDrafts()]);
  } catch {
    // Keep the page renderable when the API is unavailable.
  }

  return (
    <section className="grid" style={{ gap: 16 }}>
      <div className="panel">
        <h2>Studio</h2>
        <p style={{ marginBottom: 6 }}>
          This is the new control-tower lane. In plain English: first we tell Pulse which page can speak, then we save a draft, then we approve it, and only then do we send it into the queue.
        </p>
        <small>The queue is still the delivery lane, but Studio is now the authoring lane.</small>
      </div>
      <PostStudio projects={projects} destinations={destinations} drafts={drafts} />
    </section>
  );
}
