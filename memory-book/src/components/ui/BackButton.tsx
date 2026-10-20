"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "./Icons";

const KEY = "mb-moved-in-app";

/** Notes once you've moved between pages in this tab, so Back can go back instead of leaving the app. */
export function NavigationTracker() {
  const pathname = usePathname();
  useEffect(() => {
    const first = sessionStorage.getItem(`${KEY}-first`);
    if (first === null) sessionStorage.setItem(`${KEY}-first`, pathname);
    else if (first !== pathname) sessionStorage.setItem(KEY, "1");
  }, [pathname]);
  return null;
}

/**
 * Back to the page you came from in the app; if you opened this page
 * directly (a link, a bookmark, a fresh tab), to `fallback` instead.
 */
export function BackButton({ fallback, label = "Back", className = "" }: { fallback: string; label?: string; className?: string }) {
  const router = useRouter();
  function goBack() {
    let moved = false;
    try {
      moved = sessionStorage.getItem(KEY) === "1" && window.history.length > 1;
    } catch {
      // Storage blocked: just go to the sensible place.
    }
    if (moved) router.back();
    else router.push(fallback);
  }
  return (
    <button type="button" onClick={goBack} className={`icon-button back-button ${className}`} aria-label={label} title={label}>
      <ChevronLeft />
    </button>
  );
}
