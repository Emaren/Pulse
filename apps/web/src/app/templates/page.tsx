import { TemplateLibrary } from "@/components/TemplateLibrary";
import { getDestinations, getProjects, getTemplates, type Destination, type Project, type Template } from "@/lib/api";

export default async function TemplatesPage() {
  let templates: Template[] = [];
  let destinations: Destination[] = [];
  let projects: Project[] = [];

  try {
    [templates, destinations, projects] = await Promise.all([getTemplates(), getDestinations(), getProjects()]);
  } catch {
    // Keep the page renderable when the API is unavailable.
  }

  return (
    <TemplateLibrary initialTemplates={templates} destinations={destinations} projects={projects} />
  );
}
