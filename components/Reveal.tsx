"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Gentle reveal-on-scroll wrapper. Respects prefers-reduced-motion (CSS
 * disables transitions) and leaves content visible if IntersectionObserver
 * is unavailable.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  from,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  from?: "up" | "left" | "right" | "fade";
  as?: "div" | "section" | "li" | "span" | "article";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-in");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("is-in");
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      data-reveal={from ?? "up"}
      ref={ref as never}
      className={className}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}