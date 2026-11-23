import { describe, expect, it } from "vitest";
import { defaultCms, ensureCms } from "@/lib/cms/defaults";

describe("full-page CMS data", () => {
  it("starts with safe empty pages so existing coded pages remain the fallback", () => {
    const cms = defaultCms();
    expect(cms.pages.home.blocks).toHaveLength(0);
    expect(cms.pages.about.blocks).toHaveLength(0);
  });

  it("keeps supported block types and removes unsafe links", () => {
    const cms = ensureCms({
      pages: {
        home: {
          title: "Editable home",
          blocks: [
            {
              id: "hero 1",
              type: "hero",
              title: "Hello",
              primaryCtaHref: "javascript:alert(1)",
              imageUrl: "https://cdn.example.test/hero.jpg",
            },
            { id: "unknown", type: "script", body: "discard me" },
          ],
        },
      },
    });

    expect(cms.pages.home.title).toBe("Editable home");
    expect(cms.pages.home.blocks).toHaveLength(1);
    expect(cms.pages.home.blocks[0]).toMatchObject({
      id: "hero-1",
      type: "hero",
      title: "Hello",
      primaryCtaHref: "",
      imageUrl: "https://cdn.example.test/hero.jpg",
    });
  });

  it("caps block and collection sizes", () => {
    const blocks = Array.from({ length: 45 }, (_, index) => ({
      id: String(index),
      type: "richText",
      body: "x".repeat(10_000),
    }));
    const cms = ensureCms({ pages: { home: { blocks } } });
    expect(cms.pages.home.blocks).toHaveLength(40);
    expect((cms.pages.home.blocks[0] as { body: string }).body.length).toBe(6000);
  });
});
