"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Shrinks handwriting a little (down to 80%) when a memory is slightly too
 * long for its page, instead of cutting it off. Works through the
 * `--fit` CSS variable on the text element.
 */
export function useFitText<T extends HTMLElement>(text: string) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      if (el.clientHeight === 0) return; // page not visible yet
      let scale = 1;
      el.style.setProperty("--fit", "1");
      while (el.scrollHeight > el.clientHeight + 1 && scale > 0.8) {
        scale = Math.round((scale - 0.04) * 100) / 100;
        el.style.setProperty("--fit", String(scale));
      }
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return ref;
}
