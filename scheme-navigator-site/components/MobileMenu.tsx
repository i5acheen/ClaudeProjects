'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

export function MobileMenu({
  label,
  links,
  footer,
}: {
  label: string;
  links: { href: string; label: string }[];
  footer?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Close the menu after navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="xl:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="inline-flex size-12 items-center justify-center rounded-full text-ink hover:bg-brand-50"
      >
        {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
        <span className="sr-only">{label}</span>
      </button>
      {open && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-white shadow-lg"
        >
          <ul className="container-x flex flex-col py-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="flex min-h-13 items-center border-b border-line text-lg font-medium text-ink"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          {footer && <div className="container-x pb-4">{footer}</div>}
        </div>
      )}
    </div>
  );
}
