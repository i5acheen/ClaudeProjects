'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureSource } from '@/lib/source';

/** Stores the visit's src / UTM tags so forms and WhatsApp links can include them. */
export function SourceCapture({ defaultSrc }: { defaultSrc?: string }) {
  const pathname = usePathname();
  useEffect(() => {
    captureSource(defaultSrc);
  }, [pathname, defaultSrc]);
  return null;
}
