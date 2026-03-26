import { TemplateLibrary } from "@/components/TemplateLibrary";
import { getDestinations, getTemplates, type Destination, type Template } from "@/lib/api";

export default async function TemplatesPage() {
  let templates: Template[] = [];
  let destinations: Destination[] = [];

  try {
    [templates, destinations] = await Promise.all([getTemplates(), getDestinations()]);
  } catch {
    // Keep the page renderable when the API is unavailable.
  }

  return (
    <TemplateLibrary initialTemplates={templates} destinations={destinations} />
  );
}
