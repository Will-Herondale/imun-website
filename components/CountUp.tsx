"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a numeric value up when it scrolls into view, preserving any
 * non-numeric prefix/suffix (e.g. "15+"). Shows the final value immediately
 * under prefers-reduced-motion or without IntersectionObserver.
 */
export function CountUp({
  value,
  className = "",
  duration = 1300,
}: {
  value: string;
  className?: string;
  duration?: number;
}) {
  const match = value.match(/^(\D*)(\d+)(\D*)$/);
  const target = match ? Number(match[2]) : null;
  const prefix = match?.[1] ?? "";
  const suffix = match?.[3] ?? "";
  const [display, setDisplay] = useState(target === null ? value : `${prefix}0${suffix}`);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (target === null) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let start = 0;
    let started = false;

    const run = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(`${prefix}${Math.round(target * eased)}${suffix}`);
      if (p < 1) raf = requestAnimationFrame(run);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      raf = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(raf);
    }

    if (!("IntersectionObserver" in window)) {
      raf = requestAnimationFrame(run);
      return () => cancelAnimationFrame(raf);
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started) {
          started = true;
          raf = requestAnimationFrame(run);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, value, prefix, suffix, duration]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
