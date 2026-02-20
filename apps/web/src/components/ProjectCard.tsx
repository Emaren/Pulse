type ProjectCardProps = {
  name: string;
  tone: string;
  url: string;
};

export function ProjectCard({ name, tone, url }: ProjectCardProps) {
  return (
    <article className="panel">
      <h3>{name}</h3>
      <small>Tone: {tone}</small>
      <p style={{ marginBottom: 0 }}>
        <a href={url} target="_blank" rel="noreferrer">
          {url}
        </a>
      </p>
    </article>
  );
}
