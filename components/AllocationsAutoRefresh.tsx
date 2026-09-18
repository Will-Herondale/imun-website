"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps the public allocations page current. The page is server-rendered on
 * demand, so a soft refresh re-reads the allocation table; we do it on an
 * interval and whenever the tab regains focus, so an open page tracks the
 * secretariat's work without anyone reloading.
 */
export function AllocationsAutoRefresh({ intervalMs = 60000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs]);

  return null;
}
