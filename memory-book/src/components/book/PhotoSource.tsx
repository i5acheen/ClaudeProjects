"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * Where photo pixels come from. Demo mode serves bundled files; the Drive
 * version (stage 2) fetches with the user's token and caches thumbnails.
 * An async resolver must return the same cached Promise for the same
 * (fileId, size) pair, otherwise every render would start a new fetch.
 */
export type PhotoSize = "thumb" | "full";
export type PhotoResolver = (fileId: string, size: PhotoSize) => string | Promise<string>;

export const demoPhotoResolver: PhotoResolver = (fileId) => `/demo/${fileId.replace(/^demo:/, "")}`;

const PhotoResolverContext = createContext<PhotoResolver>(demoPhotoResolver);

export function PhotoSourceProvider({ resolver, children }: { resolver: PhotoResolver; children: React.ReactNode }) {
  return <PhotoResolverContext.Provider value={resolver}>{children}</PhotoResolverContext.Provider>;
}

export function usePhotoSrc(fileId: string | undefined, size: PhotoSize = "full"): string | undefined {
  const resolve = useContext(PhotoResolverContext);
  const immediate = fileId ? resolve(fileId, size) : undefined;
  const [asyncSrc, setAsyncSrc] = useState<{ key: string; src: string }>();

  useEffect(() => {
    if (!(immediate instanceof Promise) || !fileId) return;
    let cancelled = false;
    immediate.then(
      (src) => !cancelled && setAsyncSrc({ key: `${fileId}:${size}`, src }),
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [immediate, fileId, size]);

  if (typeof immediate === "string") return immediate;
  return asyncSrc?.key === `${fileId}:${size}` ? asyncSrc.src : undefined;
}
