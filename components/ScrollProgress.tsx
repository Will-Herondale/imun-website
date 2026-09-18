"use client";

import { useEffect, useState } from "react";

/** Hairline reading-progress bar pinned to the bottom of the header. */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(1, el.scrollTop / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-azure-400"
      style={{ transform: `scaleX(${progress})` }}
    />
  );
}
