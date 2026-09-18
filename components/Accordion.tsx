"use client";

import { useId, useState, type ReactNode } from "react";

export function Accordion({
  items,
}: {
  items: { question: string; answer: ReactNode }[];
}) {
  const baseId = useId();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-steel-200 border-y border-steel-200">
      {items.map((item, i) => {
        const expanded = open === i;
        const buttonId = `${baseId}-btn-${i}`;
        const panelId = `${baseId}-panel-${i}`;
        return (
          <div key={item.question}>
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : i)}
                className="accordion-toggle group flex w-full items-center justify-between gap-6 py-5 text-left"
              >
                <span className="font-display text-[1.1rem] font-medium leading-snug text-navy-900 duration-200 group-hover:text-navy-600">
                  {item.question}
                </span>
                <span
                  aria-hidden="true"
                  className="accordion-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-steel-200 text-navy-500"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`accordion-panel ${expanded ? "open" : ""}`}
            >
              <div>
                <p className="max-w-[58rem] pb-6 text-[0.98rem] leading-relaxed text-steel-600">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}