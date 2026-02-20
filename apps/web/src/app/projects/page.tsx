import { ProjectCard } from "@/components/ProjectCard";

const demoProjects = [
  { name: "TokenTap", tone: "energetic", url: "https://tokentap.ca" },
  { name: "VPS-Sentry", tone: "practical", url: "https://vps-sentry.ca" },
  { name: "TMail", tone: "direct", url: "https://tmail.tokentap.ca" },
];

export default function ProjectsPage() {
  return (
    <section>
      <h2>Projects</h2>
      <div className="grid two">
        {demoProjects.map((project) => (
          <ProjectCard key={project.name} {...project} />
        ))}
      </div>
    </section>
  );
}
