import { PostPreview } from "@/components/PostPreview";

export default function TemplatesPage() {
  return (
    <section>
      <h2>Templates</h2>
      <div className="grid two">
        <PostPreview
          platform="x"
          text="Working on TokenTap: added smarter queue retries.\n\nhttps://tokentap.ca #retention #localbusiness"
        />
        <PostPreview
          platform="facebook"
          text="Update from VPS-Sentry:\nWe shipped a faster health-check loop and cleaner alerts.\n\nhttps://vps-sentry.ca"
        />
      </div>
    </section>
  );
}
