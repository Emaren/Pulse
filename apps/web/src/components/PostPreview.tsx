type PostPreviewProps = {
  platform: "x" | "facebook";
  text: string;
};

export function PostPreview({ platform, text }: PostPreviewProps) {
  return (
    <article className="panel">
      <h3>{platform.toUpperCase()} Preview</h3>
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          fontFamily: "IBM Plex Mono, Menlo, monospace",
          lineHeight: 1.4,
        }}
      >
        {text}
      </pre>
    </article>
  );
}
