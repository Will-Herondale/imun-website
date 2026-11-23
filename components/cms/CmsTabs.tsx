"use client";

import { useState } from "react";
import type { TabItem } from "@/lib/cms/types";

export function CmsTabs({ items }: { items: TabItem[] }) {
  const [selected, setSelected] = useState(0);
  const active = items[selected] ?? items[0];
  if (!active) return null;

  return (
    <div className="border-y border-steel-200">
      <div role="tablist" aria-label="Page sections" className="flex flex-wrap gap-2 border-b border-steel-200 py-3">
        {items.map((item, index) => (
          <button
            key={`${item.label}-${index}`}
            type="button"
            role="tab"
            aria-selected={selected === index}
            onClick={() => setSelected(index)}
            className={`px-4 py-2 text-[0.78rem] font-semibold uppercase tracking-[0.12em] transition-colors ${
              selected === index
                ? "bg-navy-900 text-white"
                : "text-steel-500 hover:bg-steel-50 hover:text-navy-900"
            }`}
          >
            {item.label || `Tab ${index + 1}`}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="py-7 text-[1rem] leading-relaxed text-steel-600">
        {active.content.split(/\n{2,}/).map((paragraph, index) => (
          <p key={index} className={index ? "mt-4" : ""}>
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
