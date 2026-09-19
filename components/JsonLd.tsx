/**
 * Renders a JSON-LD block for search engines. Accepts one schema object or an
 * array of them; arrays are emitted as a single @graph-compatible script.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
