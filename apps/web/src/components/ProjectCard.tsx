type ProjectCardProps = {
  name: string;
  tone: string;
  url: string;
  active?: boolean;
};

export function ProjectCard({ name, tone, url, active = true }: ProjectCardProps) {
  return (
    <article className="panel">
      <h3>{name}</h3>
      <small>
        Tone: {tone} · {active ? "active" : "paused"}
      </small>
      <p style={{ marginBottom: 0 }}>
        <a href={url} target="_blank" rel="noreferrer">
          {url}
        </a>
      </p>
    </article>
  );
}
