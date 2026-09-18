import type { ReactNode } from "react";

/**
 * Layout wrapper retained for the existing `as` / `className` API.
 *
 * The scroll-reveal animation was removed as part of the document-style
 * presentation: content is always visible and nothing animates on scroll.
 * The `delay` / `from` props are accepted but intentionally ignored.
 */
export function Reveal({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  from?: "up" | "left" | "right" | "fade";
  as?: "div" | "section" | "li" | "span" | "article";
}) {
  return <Tag className={className}>{children}</Tag>;
}
